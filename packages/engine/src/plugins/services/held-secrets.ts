import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { redactedSecret } from '@repo/contracts/plugins/plugin-operations';

const isRecord = (value: Json): value is { [key: string]: Json } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/*
 * The secret param values of the Operations running now (ADR-0051). While one runs, each is replaced in
 * every line the Plugin log writes and in what the run answers, so a Plugin that names its token in a
 * logged call, a result or an error never lands it in a log, a Session's history or `argo` CLI output.
 */
export class HeldSecrets {
  private readonly held = new Map<string, number>();

  // Holds the values until the run ends, however it ends.
  public async during<T>(
    values: readonly string[],
    run: () => Promise<T>,
  ): Promise<T> {
    const kept = values.filter((value) => value.length > 0);

    for (const value of kept) this.hold(value);

    try {
      return await run();
    } finally {
      for (const value of kept) this.release(value);
    }
  }

  // The longest first, so a secret inside another is never left half shown.
  public scrub(text: string): string {
    return [...this.held.keys()]
      .toSorted((a, b) => b.length - a.length)
      .reduce(
        (scrubbed, value) => scrubbed.replaceAll(value, redactedSecret),
        text,
      );
  }

  public scrubJson(value: Json): Json {
    if (typeof value === 'string') return this.scrub(value);

    return isRecord(value) ? this.scrubRecord(value) : this.scrubList(value);
  }

  private scrubList(value: Json): Json {
    return Array.isArray(value)
      ? value.map((item) => this.scrubJson(item))
      : value;
  }

  // A log that never writes a held value.
  public scrubbing(log: (line: string) => void): (line: string) => void {
    return (line) => log(this.scrub(line));
  }

  private scrubRecord(record: { [key: string]: Json }): Json {
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        this.scrub(key),
        this.scrubJson(item),
      ]),
    );
  }

  private hold(value: string): void {
    this.held.set(value, (this.held.get(value) ?? 0) + 1);
  }

  private release(value: string): void {
    const count = (this.held.get(value) ?? 1) - 1;

    if (count > 0) this.held.set(value, count);
    else this.held.delete(value);
  }
}
