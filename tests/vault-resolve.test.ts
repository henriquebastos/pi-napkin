import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { findVaultPath } from "../extensions/vault-resolve.ts";

const originalHome = process.env.HOME;
const tempRoots: string[] = [];

type ResolutionMode = "nearest" | "fixed" | "bounded";

interface VaultFixture {
  home: string;
  projectCwd: string;
  configuredVault: string;
}

async function createVault(root: string): Promise<void> {
  const napkinDir = path.join(root, ".napkin");
  await mkdir(napkinDir, { recursive: true });
  await writeFile(path.join(napkinDir, "config.json"), "{}\n");
}

async function createFixture(
  resolution?: ResolutionMode,
): Promise<VaultFixture> {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "pi-napkin-vault-"));
  tempRoots.push(tempRoot);

  const home = path.join(tempRoot, "home");
  const projectCwd = path.join(home, "me", "oss", "project");
  const configuredVault = path.join(home, ".pi", "agent", "kb");

  await mkdir(projectCwd, { recursive: true });
  await createVault(configuredVault);
  await mkdir(path.join(home, ".pi", "agent"), { recursive: true });
  await writeFile(
    path.join(home, ".pi", "agent", "napkin.json"),
    `${JSON.stringify(
      {
        vault: "~/.pi/agent/kb",
        ...(resolution ? { resolution } : {}),
      },
      null,
      2,
    )}\n`,
  );

  process.env.HOME = home;

  return { home, projectCwd, configuredVault };
}

describe("vault resolution", () => {
  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    await Promise.all(
      tempRoots
        .splice(0)
        .map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("fixed resolution uses the configured vault even when $HOME contains a .napkin directory", async () => {
    const { home, projectCwd, configuredVault } = await createFixture("fixed");
    await createVault(home);

    assert.equal(
      findVaultPath(projectCwd),
      path.join(configuredVault, ".napkin"),
    );
  });

  it("fixed resolution ignores a project-local .napkin directory", async () => {
    const { projectCwd, configuredVault } = await createFixture("fixed");
    await createVault(projectCwd);

    assert.equal(
      findVaultPath(projectCwd),
      path.join(configuredVault, ".napkin"),
    );
  });

  it("nearest resolution preserves the existing nearest ancestor .napkin behavior", async () => {
    const { home, projectCwd } = await createFixture("nearest");
    await createVault(home);

    assert.equal(findVaultPath(projectCwd), path.join(home, ".napkin"));
  });

  it("omitted resolution defaults to nearest", async () => {
    const { home, projectCwd } = await createFixture();
    await createVault(home);

    assert.equal(findVaultPath(projectCwd), path.join(home, ".napkin"));
  });

  it("bounded resolution walks up to find $HOME/.napkin when no stop dir is encountered", async () => {
    const { home, projectCwd } = await createFixture("bounded");
    await createVault(home);

    assert.equal(findVaultPath(projectCwd), path.join(home, ".napkin"));
  });

  it("bounded resolution still accepts a project-local .napkin", async () => {
    const { projectCwd } = await createFixture("bounded");
    await createVault(projectCwd);

    assert.equal(findVaultPath(projectCwd), path.join(projectCwd, ".napkin"));
  });

  it("bounded resolution stops at the git root before checking parent directories", async () => {
    const { home, projectCwd, configuredVault } =
      await createFixture("bounded");
    const subdir = path.join(projectCwd, "src", "feature");
    const parentAboveGitRoot = path.join(home, "me", "oss");

    await mkdir(subdir, { recursive: true });
    await mkdir(path.join(projectCwd, ".git"));
    await createVault(parentAboveGitRoot);

    assert.equal(findVaultPath(subdir), path.join(configuredVault, ".napkin"));
  });
});
