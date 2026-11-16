import { type SyntaxRun, syntaxRuns } from '@repo/kit/primitives/content/code';

const shownOutput = (output: string): string =>
  output.replaceAll('\r\n', '\n').replace(/\n$/, '');

// The command coloured as bash; one too long to colour draws plain.
const commandRuns = (command: string): SyntaxRun[] =>
  syntaxRuns(command, 'bash') ?? [{ text: command }];

// Output is not bash, so it stays plain under the coloured command.
function outputRuns(output: string): SyntaxRun[] {
  const shown = shownOutput(output);

  return shown ? [{ text: `\n${shown}` }] : [];
}

// A prompt, the command, then whatever it has printed.
export const shellRuns = (command: string, output = ''): SyntaxRun[] => [
  { text: '$ ' },
  ...commandRuns(command),
  ...outputRuns(output),
];
