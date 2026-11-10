import { describe, expect, it } from 'vitest';
import {
  readShellOutput,
  type ShellOutputRead,
  shellOutputLines,
} from './shell-output-read';

const escape = '\u001B';

const sample = [
  `${escape}[31mred start\nstill red${escape}[0m\n`,
  'plain http://x.dev/a\n',
  '10%\r50%\r100%\r\n',
  `${escape}[2mdim${escape}[22m back\n\n`,
  'tail without newline',
].join('');

function readInPieces(text: string, cuts: number[]): ShellOutputRead {
  let read = readShellOutput('');

  for (const end of [...cuts, text.length])
    read = readShellOutput(text.slice(0, end), read);

  return read;
}

describe('readShellOutput', () => {
  it('reads output in pieces as it reads it whole, wherever the pieces break', () => {
    const whole = shellOutputLines(sample);

    for (let cut = 0; cut <= sample.length; cut += 1)
      expect(readInPieces(sample, [cut]).lines).toEqual(whole);
  });

  it('reads many small pieces as it reads the whole', () => {
    const cuts = Array.from({ length: sample.length }, (_, at) => at);

    expect(readInPieces(sample, cuts).lines).toEqual(shellOutputLines(sample));
  });

  it('keeps the lines it already read when more output arrives', () => {
    const first = readShellOutput('one\ntwo\nthr');
    const next = readShellOutput('one\ntwo\nthree\nfour', first);

    expect(next.lines[0]).toBe(first.lines[0]);
    expect(next.lines[1]).toBe(first.lines[1]);
    expect(next.lines.slice(2)).toEqual([
      [{ text: 'three' }],
      [{ text: 'four' }],
    ]);
  });

  it('reads it all again when the text is not a continuation', () => {
    const first = readShellOutput('one\ntwo\n');
    const next = readShellOutput('other\n', first);

    expect(next.lines).toEqual([[{ text: 'other' }]]);
  });
});
