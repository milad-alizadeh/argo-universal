import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ElectronApplication } from '@playwright/test';
import { expect } from '../fixtures';

const run = promisify(execFile);

const nativeWindow = (pid: number): string =>
  `tell application "System Events" to tell (first process whose unix id is ${pid}) to tell front window`;

// Native message boxes live outside the renderer. macOS accessibility reads and clicks the actual controls.
export async function answerQuitDialog(
  application: ElectronApplication,
  choice: string,
): Promise<void> {
  const target = nativeWindow(application.process().pid ?? 0);
  await expectQuitDialog(target);
  await run(
    'osascript',
    ['-e', `${target}\nclick button ${JSON.stringify(choice)}\nend tell`],
    { timeout: 5000 },
  );
}

async function expectQuitDialog(target: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const { stdout } = await run(
          'osascript',
          ['-e', `${target}\nget value of every static text\nend tell`],
          { timeout: 5000 },
        );

        return stdout;
      },
      { timeout: 15_000 },
    )
    .toContain('1 Sessions are running. Keep them going?');
}

export async function requestQuit(
  application: ElectronApplication,
): Promise<void> {
  await application.evaluate(({ app }): void => {
    app.quit();
  });
}
