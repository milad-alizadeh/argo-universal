import { createHash } from 'node:crypto';

// Identity follows loaded source bytes, including comments that bundling removes.
export class DevVersion {
  private readonly files = new Map<string, string>();

  readonly reset = (): void => {
    this.files.clear();
  };
  readonly record = (path: string, contents: string): void => {
    this.files.set(path, digest(contents));
  };

  value(output: string): string {
    return digest(
      JSON.stringify(
        [...this.files].sort(([left], [right]) => left.localeCompare(right)),
      ) + output,
    );
  }
}

function digest(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}
