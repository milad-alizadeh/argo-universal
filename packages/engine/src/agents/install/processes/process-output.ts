import { writeFile } from 'node:fs/promises';
import { stripVTControlCharacters } from 'node:util';
import type { InstallToolInput } from '../ports';
const textOutputLimit = 1_048_576;
const isDiagnosticWhitespace = (character: string): boolean =>
  character === '\n' || character === '\t';
const keepDiagnosticCharacter = (character: string): boolean =>
  isDiagnosticWhitespace(character) || !/\p{Cc}/u.test(character);
export const cleanDiagnostic = (diagnostic: string): string =>
  stripVTControlCharacters(diagnostic)
    .split('')
    .filter(keepDiagnosticCharacter)
    .join('')
    .trim();
export const outputFailure = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Invalid installer output');
export class InstallOutput {
  private readonly chunks: Buffer[] = [];
  private size = 0;
  public constructor(private readonly input: InstallToolInput) {}
  public accept(chunk: Buffer): void {
    this.size += chunk.length;
    if (this.size > (this.input.outputLimit ?? textOutputLimit))
      throw new Error('Installer output exceeded its budget');
    this.chunks.push(chunk);
  }
  public async finish(): Promise<string> {
    const output = Buffer.concat(this.chunks);
    if (!this.input.outputFile) return output.toString();
    await writeFile(this.input.outputFile, output, { flag: 'wx' });
    return '';
  }
}
