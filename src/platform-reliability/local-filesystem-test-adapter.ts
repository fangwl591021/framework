import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BackupStoragePort } from "./backup";
import { ReliabilityError } from "./models";

const SAFE_BACKUP_ID = /^[0-9A-Za-z-]{8,80}$/;
const SAFE_REFERENCE = /^local-file:([0-9A-Za-z-]{8,80})\.backup$/;

export class LocalFilesystemTestAdapter implements BackupStoragePort {
  readonly providerName = "local-filesystem-test";
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(backupId: string, content: Uint8Array): Promise<string> {
    if (!SAFE_BACKUP_ID.test(backupId)) {
      throw new ReliabilityError("BACKUP_CORRUPTED");
    }
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, `${backupId}.backup`), content, {
      flag: "wx",
    });
    return `local-file:${backupId}.backup`;
  }

  async get(storageReference: string): Promise<Uint8Array | null> {
    const match = SAFE_REFERENCE.exec(storageReference);
    if (!match?.[1]) throw new ReliabilityError("BACKUP_CORRUPTED");
    try {
      return new Uint8Array(
        await readFile(join(this.root, `${match[1]}.backup`)),
      );
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? error.code
        : null;
      if (code === "ENOENT") return null;
      throw error;
    }
  }
}
