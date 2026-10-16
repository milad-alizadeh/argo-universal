import type { ReadEntry } from 'tar';
import { installationPath } from './files';
export const executableMode = 0o755;

export const extractedLimit = 536_870_912;

const entryLimit = 10_000;

export class ArchiveBudget {
  private size = 0;
  private entries = 0;
  private failure: Error | undefined;
  public constructor(private readonly directory: string) {}
  public accept(name: string, size: number): void {
    installationPath(this.directory, name);
    this.size += size;
    this.entries += 1;

    if (this.size > extractedLimit || this.entries > entryLimit)
      throw new Error('Agent archive exceeds the extracted file budget');
  }
  public acceptTar(entry: ReadEntry): void {
    try {
      this.accept(entry.path, entry.size);
      this.requireFile(entry);
    } catch (error) {
      this.failure =
        error instanceof Error ? error : new Error('Malformed Agent archive');
    }
  }
  private requireFile(entry: ReadEntry): void {
    if (!['File', 'Directory'].includes(entry.type))
      throw new Error('Agent archives cannot contain links or special files');
  }
  public verify(): void {
    if (this.failure) throw this.failure;
  }
}
