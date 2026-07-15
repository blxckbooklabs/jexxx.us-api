/** Resolve built jexxx.us-cli dist: monorepo sibling first, then vendored copy. */
export declare function cliDistRoot(): string;
/** Load a built jexxx.us-cli dist module at runtime. */
export declare function loadCliModule<T>(relativePath: string): Promise<T>;
