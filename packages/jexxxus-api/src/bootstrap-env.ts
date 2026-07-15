import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));

const candidates = [
  process.env.JEXXXUS_API_ENV_FILE?.trim(),
  resolve(here, "../../../../jexxx.us-infrastructure/jexxxus-api/.env"),
  resolve(process.cwd(), "../../../jexxx.us-infrastructure/jexxxus-api/.env"),
].filter(Boolean) as string[];

for (const path of candidates) {
  if (existsSync(path)) {
    dotenv.config({ path });
    break;
  }
}

// Server process must read Supabase directly — never HTTP-loop back to itself.
if (!process.env.JEXXXUS_ACCOUNT_API?.trim()) {
  process.env.JEXXXUS_ACCOUNT_API = "off";
}

if (!process.env.PORT?.trim()) {
  process.env.PORT = "8787";
}