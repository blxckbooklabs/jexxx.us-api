#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import * as fs from "fs";
import { importContacts } from "./lib/contacts.js";
import { parseCsvFile, rowsToContacts } from "./lib/csv.js";
import { runDoctorFromEnv } from "./lib/doctor.js";
import { loadOperatorEnv } from "./lib/env.js";
import { getImportOwnerError } from "./lib/guards.js";
import { createNotificationsClient, sendSystemNotification, } from "./lib/notifications.js";
import { getBibleSections, getBibleBooks, findVerseWithFallback, } from "./lib/bible.js";
import { aeoDiscoveryUrls, fetchBibleAeoBundle, fetchChapterFromWeb, fetchDailyMannaText, listLiveCanons, listLiveChapters, loadLiveBibleCatalog, resolveLiveBook, } from "./lib/bible-web.js";
import { formatBibleVerseForChat } from "./lib/blxckchat/bible-format.js";
import { createOperatorClient } from "./lib/supabase.js";
import { listProvidersRedacted, resolveStartupProvider, runConfigureFlow, } from "./lib/blxckchat/config.js";
import { resolveProvider } from "./lib/blxckchat/providers/registry.js";
import { resolveBlxckchatTools } from "./lib/blxckchat/tools/registry.js";
import { runAgent } from "./lib/blxckchat/agent-loop.js";
import { startInteractiveChat } from "./lib/blxckchat/repl-ui.js";
import { logCrash } from "./lib/blxckchat/crash-log.js";
import { loadCredentials, saveCredentials, deleteCredentials, getTokenExpiryMinutes, ensureValidToken, promptYesNo, runInteractiveDeviceLogin, refreshAccessTokenViaServer, } from "./lib/auth.js";
/** Rename the terminal tab/window title (OSC 2) — same technique OpenCode uses. */
function setTerminalTitle(title) {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write(`\x1b]2;${title}\x07`);
}
function printBanner() {
    const jexxxusArt = figlet.textSync("JEXXXUS", { font: "Slant" });
    console.log(gradient(["#FF1A8C", "#FFB6C1", "#E11D8A", "#FF69B4"])(jexxxusArt));
    const welcomeMessages = [
        "Welcome to the kingdom.",
        "Welcome to the garden.",
    ];
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    console.log(gradient(["#FF1A8C", "#FFB6C1"])(`                            ${randomMessage}\n`));
}
async function launchBlxckchat(prompt, options) {
    const storedConfig = resolveStartupProvider(options.provider);
    if (!storedConfig) {
        console.error(chalk.red("[ERROR] No BLXCKCHAT provider configured yet. Run 'jexxxus blxckchat configure' first."));
        process.exit(1);
    }
    const provider = resolveProvider(storedConfig);
    const tools = resolveBlxckchatTools({
        allowShell: Boolean(options.shell),
    });
    if (options.shell) {
        console.log(chalk.yellow("[BLXCKCHAT] Shell access enabled for this session. Every command still requires confirmation and is checked against a hard-blocked pattern list."));
    }
    if (prompt) {
        const { response } = await runAgent(provider, tools, prompt);
        console.log(chalk.white(`\n${response}\n`));
        process.exit(0);
    }
    // Interactive blessed terminal UI — conversationHistory persists across
    // turns within this process. Falls back to readline on narrow/non-TTY
    // terminals. One-shot mode above stays intentionally stateless.
    await startInteractiveChat(provider, tools, {
        providerLabel: `${storedConfig.provider}/${storedConfig.model}`,
        storedConfig,
        resume: Boolean(options.resume),
        allowShell: Boolean(options.shell),
    });
}
function requireOperatorClient(target = "blxckbook") {
    const env = loadOperatorEnv();
    if (!env) {
        console.error(chalk.red("[ERROR] Missing operator credentials. Copy .env.example to .env and configure locally."));
        process.exit(1);
    }
    return createOperatorClient(env, target);
}
setTerminalTitle("JEXXXUS");
const program = new Command();
program
    .name("jexxxus")
    .description("JEXXXUS CLI — unified control plane for the JEXXXUS Ecosystem")
    .version("1.0.0")
    .argument("[prompt]", "One-shot prompt for BLXCKCHAT. Omit to enter interactive REPL mode.")
    .option("-p, --provider <name>", "Named provider config to use for this invocation")
    .option("--resume", "Resume the last autosaved BLXCKCHAT session")
    .option("--shell", "Opt in to shell access for this session (off by default; every call still requires confirmation and is checked against a hard blocklist)")
    .hook("preAction", (_thisCommand, actionCommand) => {
    // Interactive BLXCKCHAT TUI owns the screen — figlet banner on stdout
    // breaks blessed init and flashes back to the shell. This applies both
    // to the bare `jexxxus` default action and the explicit `blxckchat`
    // subcommand, since both launch the same interactive agent.
    const isAgentLaunch = actionCommand.name() === "blxckchat" || actionCommand.name() === "jexxxus";
    if (isAgentLaunch && actionCommand.args.length === 0) {
        return;
    }
    // `jexxxus auth token -q` must emit only the JWT on stdout (Hermes/curl).
    let cmd = actionCommand;
    while (cmd) {
        if (cmd.name() === "auth")
            return;
        cmd = cmd.parent;
    }
    printBanner();
})
    .action(async (prompt, options) => {
    await launchBlxckchat(prompt, options);
});
const doctorCmd = program
    .command("doctor")
    .description("Verify operator credentials and connectivity to JEXXXUS datastores")
    .option("-t, --target <dashboard>", "Target a specific dashboard: blxckbook (default) or nxt. Omitting checks both.")
    .action(async (options) => {
    const report = await runDoctorFromEnv(options.target);
    for (const check of report.checks) {
        const label = check.ok ? chalk.green("[OK]") : chalk.red("[FAIL]");
        console.log(`${label} ${check.name}: ${check.detail}`);
    }
    process.exit(report.ok ? 0 : 1);
});
const authCmd = program
    .command("auth")
    .description("Manage CLI authentication (Clerk device flow)");
authCmd
    .command("login")
    .description("Authenticate CLI via Clerk (device authorization flow)")
    .action(async () => {
    try {
        const credentials = await runInteractiveDeviceLogin();
        saveCredentials(credentials);
        console.log(chalk.green(`\n[SUCCESS] Authenticated as ${credentials.email}.`));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`\n[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
authCmd
    .command("status")
    .description("Show current authentication status")
    .action(() => {
    try {
        const creds = loadCredentials();
        if (!creds) {
            console.log(chalk.yellow("[AUTH] Not authenticated. Run: jexxxus auth login"));
            process.exit(0);
        }
        const expiryMinutes = getTokenExpiryMinutes(creds);
        const expiryStatus = expiryMinutes < 0
            ? chalk.red("EXPIRED")
            : expiryMinutes < 5
                ? chalk.yellow(`${Math.floor(expiryMinutes)}m remaining`)
                : chalk.green(`${Math.floor(expiryMinutes)}m remaining`);
        console.log(chalk.green("[AUTH] Authenticated"));
        console.log(`  Email: ${creds.email}`);
        console.log(`  User ID: ${creds.userId}`);
        console.log(`  Token expires: ${expiryStatus}`);
        console.log(`  Last refreshed: ${new Date(creds.refreshedAt).toLocaleString()}`);
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
authCmd
    .command("logout")
    .description("Revoke CLI authentication (delete stored credentials)")
    .action(async () => {
    try {
        const creds = loadCredentials();
        if (!creds) {
            console.log(chalk.yellow("[AUTH] Not authenticated."));
            process.exit(0);
        }
        const confirmed = await promptYesNo(chalk.yellow("Revoke authentication and delete stored credentials?"));
        if (!confirmed) {
            console.log(chalk.dim("Cancelled."));
            process.exit(0);
        }
        deleteCredentials();
        console.log(chalk.green("[AUTH] Credentials deleted. Run 'jexxxus auth login' to re-authenticate."));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
authCmd
    .command("token")
    .description("Print a fresh Bearer token (auto-refreshes when expiring)")
    .option("-q, --quiet", "Print only the token (for scripts / Hermes preflight)")
    .action(async (opts) => {
    try {
        const creds = await ensureValidToken(refreshAccessTokenViaServer);
        if (opts.quiet) {
            process.stdout.write(creds.accessToken);
        }
        else {
            console.log(creds.accessToken);
            const minutes = getTokenExpiryMinutes(creds);
            console.error(chalk.dim(`[token] ${creds.email} · ${Math.max(0, Math.floor(minutes * 60))}s until expiry · use jexxxus auth token before each Hermes API call`));
        }
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
authCmd
    .command("refresh")
    .description("Manually refresh access token")
    .action(async () => {
    try {
        const creds = loadCredentials();
        if (!creds) {
            console.error(chalk.red("[ERROR] Not authenticated. Run: jexxxus auth login"));
            process.exit(1);
        }
        const refreshed = await refreshAccessTokenViaServer(creds.refreshToken);
        saveCredentials(refreshed);
        console.log(chalk.green(`[SUCCESS] Token refreshed for ${refreshed.email}.`));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
program
    .command("import")
    .description("Import contacts from a CSV file into a JEXXXUS dashboard")
    .argument("<file>", "Path to the CSV file")
    .option("-f, --force", "Skip duplicate rows and import the rest")
    .option("-u, --user <userId>", "Vault account (user_id) to own the imported profiles. Required for production imports.", "SYSTEM")
    .option("--allow-system-user", "Permit the default SYSTEM owner (dev/test only)")
    .option("-t, --target <dashboard>", "Target dashboard: blxckbook (default) or nxt", "blxckbook")
    .action(async (file, options) => {
    const ownerError = getImportOwnerError(options.user, Boolean(options.allowSystemUser));
    if (ownerError) {
        console.error(chalk.red(`[ERROR] ${ownerError}`));
        process.exit(1);
    }
    if (!fs.existsSync(file)) {
        console.error(chalk.red(`[ERROR] File not found: ${file}`));
        process.exit(1);
    }
    let records;
    try {
        records = await parseCsvFile(file);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown parse error";
        console.error(chalk.red(`[ERROR] Error parsing CSV: ${message}`));
        process.exit(1);
    }
    const targetLabel = options.target === "nxt" ? "NXT" : "BLXCKBOOK";
    console.log(chalk.blue(`[INFO] Parsed ${records.length} CSV row(s). Importing to ${targetLabel} MAMAbase...`));
    const { contacts, skippedInvalid } = rowsToContacts(records, options.user);
    if (skippedInvalid > 0) {
        console.log(chalk.yellow(`[WARN] Skipped ${skippedInvalid} row(s) with empty Name.`));
    }
    if (contacts.length === 0) {
        console.log(chalk.yellow("[WARN] No valid contacts to import."));
        process.exit(1);
    }
    const supabase = requireOperatorClient(options.target);
    const imported = await importContacts(supabase, contacts, Boolean(options.force));
    if (imported > 0) {
        const schema = options.target === "nxt" ? "public.vessels" : "api.contacts";
        console.log(chalk.green(`[SUCCESS] Imported ${imported} contact(s) into ${schema}.`));
        process.exit(0);
    }
    if (!options.force) {
        console.log(chalk.yellow("[WARN] Duplicate entry detected in batch import."));
        console.log(chalk.yellow("Use --force to skip duplicates and import the rest."));
    }
    process.exit(1);
});
program
    .command("notify")
    .description("Push a system notification into a user's bell in either dashboard (Realtime, no refresh needed)")
    .requiredOption("-u, --user <clerkUserId>", "Recipient's Clerk user id")
    .requiredOption("-m, --message <text>", "Notification message")
    .option("-y, --type <type>", "Notification type: info (default), success, warning, or error", "info")
    .action(async (options) => {
    const validTypes = [
        "info",
        "success",
        "warning",
        "error",
    ];
    if (!validTypes.includes(options.type)) {
        console.error(chalk.red(`[ERROR] --type must be one of: ${validTypes.join(", ")}`));
        process.exit(1);
    }
    const env = loadOperatorEnv();
    if (!env) {
        console.error(chalk.red("[ERROR] Missing operator credentials. Copy .env.example to .env and configure locally."));
        process.exit(1);
    }
    const client = createNotificationsClient(env);
    const result = await sendSystemNotification(client, {
        recipientUserId: options.user,
        message: options.message,
        type: options.type,
    });
    if (!result.ok) {
        console.error(chalk.red(`[ERROR] ${result.error}`));
        process.exit(1);
    }
    console.log(chalk.green(`[SUCCESS] Notification sent to ${options.user} (visible in both dashboards).`));
    process.exit(0);
});
const bibleCmd = program
    .command("bible")
    .description("Query the JEXXXUS super-canon Bible (live bible.jexxx.us — 131 books)");
bibleCmd
    .command("canons")
    .description("List live canons and book counts")
    .action(async () => {
    try {
        const canons = await listLiveCanons();
        console.log(chalk.green(`[Canons — ${canons.reduce((n, c) => n + c.bookCount, 0)} books]`));
        for (const c of canons) {
            console.log(`  • ${c.canon}: ${c.bookCount} books · ${c.chapterCount} ch`);
        }
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("catalog")
    .alias("books")
    .description("List live super-canon books (optional --canon filter)")
    .option("-c, --canon <name>", "Filter by canon (e.g. Nag Hammadi)")
    .option("-q, --query <text>", "Filter by book name")
    .action(async (options) => {
    try {
        let books = await loadLiveBibleCatalog();
        if (options.canon) {
            const n = options.canon.toLowerCase();
            books = books.filter((b) => b.canon.toLowerCase().includes(n));
        }
        if (options.query) {
            const n = options.query.toLowerCase();
            books = books.filter((b) => b.name.toLowerCase().includes(n));
        }
        console.log(chalk.green(`[Catalog — ${books.length} books]`));
        for (const b of books) {
            console.log(`  • ${b.name} (${b.chapterCount} ch) · ${b.canon}`);
        }
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("section")
    .description("List canons (live) or local vault sections if mounted")
    .action(async () => {
    try {
        const canons = await listLiveCanons();
        console.log(chalk.green("[Live canons]"));
        canons.forEach((c) => {
            console.log(`  • ${c.canon} (${c.bookCount} books)`);
        });
        const sections = getBibleSections();
        if (sections.length) {
            console.log(chalk.green("\n[Local vault sections]"));
            sections.forEach((section) => {
                const cleanName = section.replace(/^\d{2}-/, "");
                console.log(`  • ${cleanName} (${section})`);
            });
        }
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("book <sectionOrCanon>")
    .description("List books in a live canon (e.g. \"Nag Hammadi\") or local vault section")
    .action(async (sectionOrCanon) => {
    try {
        // Prefer live canon filter
        const books = await loadLiveBibleCatalog();
        const needle = sectionOrCanon.toLowerCase();
        const live = books.filter((b) => b.canon.toLowerCase().includes(needle) ||
            b.canon.toLowerCase() === needle);
        if (live.length) {
            console.log(chalk.green(`[Books — ${sectionOrCanon}]`));
            live.forEach((b) => {
                console.log(`  • ${b.name} (${b.chapterCount} ch)`);
            });
            process.exit(0);
        }
        const vaultBooks = getBibleBooks(sectionOrCanon);
        console.log(chalk.green(`[Books in vault ${sectionOrCanon}]`));
        vaultBooks.forEach((book) => {
            const cleanName = book.replace(/^\d{2}-/, "");
            console.log(`  • ${cleanName}`);
        });
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("chapters <book>")
    .description("List chapter numbers for a live book (e.g. \"1 Enoch\")")
    .action(async (book) => {
    try {
        const meta = await resolveLiveBook(book);
        const chapters = await listLiveChapters(book);
        if (!meta || !chapters.length) {
            console.error(chalk.red(`[ERROR] Book not found: ${book}`));
            process.exit(1);
        }
        console.log(chalk.green(`[${meta.name} — ${chapters.length} chapters · ${meta.canon}]`));
        console.log(`  ${chapters.join(", ")}`);
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("chapter <book> <chapter>")
    .description("Print a full chapter from the live corpus (e.g. Genesis 1)")
    .action(async (book, chapter) => {
    try {
        const n = parseInt(chapter, 10);
        const payload = await fetchChapterFromWeb(book, n);
        if (!payload) {
            console.error(chalk.red(`[ERROR] Chapter not found: ${book} ${chapter}`));
            process.exit(1);
        }
        console.log(chalk.blue(`${payload.book} ${payload.chapter}` +
            (payload.canon ? ` · ${payload.canon}` : "")));
        console.log(chalk.dim(payload.url));
        console.log(chalk.dim("─".repeat(60)));
        for (const v of payload.verses) {
            console.log(`${chalk.cyan(String(v.verse).padStart(3))}  ${v.text}`);
        }
        console.log(chalk.dim("─".repeat(60)));
        console.log(chalk.gray(`via ${payload.sourceType}`));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("verse <book> <chapter> <verse>")
    .description("Get a specific verse (e.g., Genesis 1 1) via live corpus")
    .action(async (book, chapter, verse) => {
    try {
        const verseData = await findVerseWithFallback(`${book} ${chapter}:${verse}`);
        if (!verseData) {
            console.error(chalk.red(`[ERROR] Verse not found: ${book} ${chapter}:${verse}`));
            process.exit(1);
        }
        console.log(formatBibleVerseForChat(verseData));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("query <query>")
    .description('Query a verse (e.g. "Genesis 1:1", "Jn 3:16", "1 Enoch 1:1")')
    .action(async (query) => {
    try {
        const verseData = await findVerseWithFallback(query);
        if (!verseData) {
            console.error(chalk.red(`[ERROR] Verse not found: ${query}`));
            process.exit(1);
        }
        console.log(formatBibleVerseForChat(verseData));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("manna")
    .description("Daily Manna from bible.jexxx.us feed.xml")
    .action(async () => {
    try {
        console.log(await fetchDailyMannaText());
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
bibleCmd
    .command("aeo")
    .description("AEO/SEO discovery (llms.txt, feed, sitemap)")
    .action(async () => {
    try {
        console.log(await fetchBibleAeoBundle());
        console.log(chalk.dim(JSON.stringify(aeoDiscoveryUrls(), null, 2)));
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
const blxckchatCmd = program
    .command("blxckchat")
    .description("BLXCKCHAT — the native AI agent for the JEXXXUS kingdom/garden. Bring your own LLM (Anthropic, OpenAI, or local Ollama).");
blxckchatCmd
    .command("configure")
    .description("Set up an LLM provider (Anthropic, OpenAI, or Ollama) for BLXCKCHAT")
    .option("-l, --list", "List configured providers (API keys redacted)")
    .action(async (options) => {
    if (options.list) {
        const providers = listProvidersRedacted();
        if (providers.length === 0) {
            console.log(chalk.yellow("No providers configured yet. Run 'jexxxus blxckchat configure'."));
            process.exit(0);
        }
        console.log(chalk.green("[Configured Providers]"));
        providers.forEach((p) => {
            const defaultTag = p.isDefault ? chalk.cyan(" (default)") : "";
            const keyStatus = p.hasKey ? "key set" : "no key (local)";
            console.log(`  • ${p.name}: ${p.provider}/${p.model} — ${keyStatus}${defaultTag}`);
        });
        process.exit(0);
    }
    try {
        await runConfigureFlow();
        process.exit(0);
    }
    catch (err) {
        console.error(chalk.red(`[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`));
        process.exit(1);
    }
});
blxckchatCmd
    .argument("[prompt]", "One-shot prompt for BLXCKCHAT. Omit to enter interactive REPL mode.")
    .option("-p, --provider <name>", "Named provider config to use for this invocation")
    .option("--resume", "Resume the last autosaved BLXCKCHAT session")
    .option("--shell", "Opt in to shell access for this session (off by default; every call still requires confirmation and is checked against a hard blocklist)")
    .action(async (prompt, options) => {
    await launchBlxckchat(prompt, options);
});
program
    .command("shell")
    .description("Show the JEXXXUS CLI command list (non-interactive) — bare 'jexxxus' now opens BLXCKCHAT directly.")
    .action(() => {
    program.outputHelp();
});
/**
 * Commander only auto-strips argv[1] when argv[0] is `node`. Under
 * ELECTRON_RUN_AS_NODE (JEXXXUS desktop PTY), argv[0] is the app binary so
 * the script path would be mis-parsed as the optional `[prompt]` argument and
 * launch a one-shot agent instead of the BLXCKCHAT TUI.
 */
const cliUserArgs = process.argv.slice(2);
program.parseAsync(cliUserArgs, { from: "user" }).catch((err) => {
    const message = err instanceof Error ? err.message : "Unexpected CLI failure";
    logCrash("top-level CLI failure", err);
    console.error(chalk.red(`[ERROR] ${message} — full trace: ~/.jexxxus/crash.log`));
    process.exit(1);
});
//# sourceMappingURL=index.js.map