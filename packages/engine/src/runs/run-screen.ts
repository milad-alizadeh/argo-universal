import xterm from '@xterm/headless';
import { readRunOutputRaw } from './run-output';
import { terminalColumns, terminalRows } from './terminal';

const { Terminal } = xterm;

const scrollbackLines = 1000;

// Blank lines at the end say nothing: a screen of 32 rows with 5 drawn is those 5.
const trimmed = (lines: string[]): string[] => {
  let end = lines.length;

  while (end > 0 && lines[end - 1] === '') end -= 1;

  return lines.slice(0, end);
};

export type ScreenRead = { screen: string; scrollback: string };

// What a terminal shows, drawn the way a terminal draws it: cursor movement, clears and colours are applied, not listed.
export class RunScreen {
  private readonly terminal: InstanceType<typeof Terminal>;
  private pending: Promise<void> = Promise.resolve();
  public constructor(columns: number, rows: number) {
    this.terminal = new Terminal({
      cols: columns,
      rows,
      scrollback: scrollbackLines,
      allowProposedApi: true,
    });
  }
  public write(data: string): void {
    this.pending = this.pending.then(
      () => new Promise<void>((done) => this.terminal.write(data, done)),
    );
  }
  // The screen and the most recent lines above it, once everything written so far is drawn.
  public async read(scrollback: number): Promise<ScreenRead> {
    await this.pending;
    const { buffer } = this.terminal;
    const { active } = buffer;
    const lines: string[] = [];

    for (let row = 0; row < active.length; row += 1)
      lines.push(active.getLine(row)?.translateToString(true) ?? '');

    const top = active.baseY;
    const above = lines.slice(0, top);
    const screen = trimmed(lines.slice(top));

    return {
      screen: screen.join('\n'),
      scrollback:
        scrollback > 0 ? trimmed(above.slice(-scrollback)).join('\n') : '',
    };
  }
  public async dispose(): Promise<void> {
    await this.pending;
    this.terminal.dispose();
  }
}

// How much of an ended Run's recording is drawn again to show its screen.
const replayBytes = 262_144;

// The screen an ended Run left, drawn again from its recording.
export async function drawRecording(
  path: string | undefined,
  scrollback: number,
): Promise<ScreenRead> {
  if (!path) return { screen: '', scrollback: '' };

  const screen = new RunScreen(terminalColumns, terminalRows);
  screen.write(await readRunOutputRaw(path, replayBytes));

  try {
    return await screen.read(scrollback);
  } finally {
    await screen.dispose();
  }
}
