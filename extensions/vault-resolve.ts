import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Find the .napkin/ config directory for the vault, per the resolution mode in ~/.pi/agent/napkin.json. */
export function findVaultPath(cwd: string): string | null {
  const configText = readTextFile(resolvePath(CONFIG_FILE));
  const config = resolveGlobalVaultConfig(parseRawConfig(configText));
  const resolvedCwd = resolvePath(cwd);
  const configuredVault = config.vault
    ? existsOrNull(path.join(config.vault, config.napkinDir))
    : null;

  switch (config.resolution) {
    case "fixed":
      return configuredVault;
    case "bounded":
      return (
        walkUpForVault(resolvedCwd, config.napkinDir, config.boundedStopDir) ??
        configuredVault
      );
    case "nearest":
      return walkUpForVault(resolvedCwd, config.napkinDir) ?? configuredVault;
  }
}

const VAULT_RESOLUTION_MODES = ["nearest", "fixed", "bounded"] as const;
type VaultResolutionMode = (typeof VAULT_RESOLUTION_MODES)[number];

interface GlobalVaultConfig {
  vault: string | null;
  resolution: VaultResolutionMode;
  napkinDir: string;
  boundedStopDir: string;
}

const CONFIG_FILE = "~/.pi/agent/napkin.json";
const DEFAULT_RESOLUTION: VaultResolutionMode = "nearest";
const DEFAULT_NAPKIN_DIR = ".napkin";
const DEFAULT_BOUNDED_STOP_DIR = ".git";

function parseRawConfig(configText: string | null): Record<string, unknown> {
  if (!configText) return {};
  try {
    return JSON.parse(configText) ?? {};
  } catch {
    return {};
  }
}

function resolveGlobalVaultConfig(
  raw: Record<string, unknown>,
): GlobalVaultConfig {
  const config: GlobalVaultConfig = {
    vault: null,
    resolution: DEFAULT_RESOLUTION,
    napkinDir: DEFAULT_NAPKIN_DIR,
    boundedStopDir: DEFAULT_BOUNDED_STOP_DIR,
  };
  if (isVaultResolutionMode(raw.resolution)) config.resolution = raw.resolution;
  if (isString(raw.vault)) config.vault = resolvePath(raw.vault);
  if (isString(raw.napkinDir)) config.napkinDir = raw.napkinDir;
  if (isString(raw.boundedStopDir)) config.boundedStopDir = raw.boundedStopDir;
  return config;
}

function isVaultResolutionMode(value: unknown): value is VaultResolutionMode {
  return VAULT_RESOLUTION_MODES.some((mode) => mode === value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function walkUpForVault(
  cwd: string,
  napkinDirname: string,
  stopDir?: string,
): string | null {
  for (const dir of walkUp(cwd)) {
    const napkinDir = existsOrNull(path.join(dir, napkinDirname));
    if (napkinDir) return napkinDir;
    if (stopDir && existsOrNull(path.join(dir, stopDir))) return null;
  }
  return null;
}

function* walkUp(start: string): Generator<string> {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    yield dir;
    dir = path.dirname(dir);
  }
}

function existsOrNull(p: string): string | null {
  return fs.existsSync(p) ? p : null;
}

function readTextFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function resolvePath(filePath: string): string {
  if (filePath === "~" || filePath.startsWith("~/")) {
    return path.resolve(os.homedir(), filePath.slice(2));
  }
  return path.resolve(filePath);
}
