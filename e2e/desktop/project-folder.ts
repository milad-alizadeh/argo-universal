import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, type App } from '../fixtures';

const run = promisify(execFile);

// This stays a real NSOpenPanel in Electron; a browser enters a Server path.
export async function chooseFixtureFolder(app: App): Promise<void> {
  if (!usesNativePicker(app)) {
    await app.page
      .getByRole('textbox', { name: 'Folder' })
      .fill(app.projectPath);

    return;
  }

  await showPicker(app);
  await chooseNativeFolder(desktopPid(app), app.projectPath);
}

async function showPicker(app: App): Promise<void> {
  await app.desktop?.application.evaluate(
    ({ app: electronApp, BrowserWindow }): void => {
      electronApp.focus({ steal: true });
      BrowserWindow.getAllWindows()[0]?.show();
      BrowserWindow.getAllWindows()[0]?.focus();
    },
  );
  await app.page.getByRole('button', { name: 'Choose Folder…' }).click();
}

const panelScript = `on run argv
  set targetPid to item 1 of argv as integer
  tell application "System Events" to tell (first process whose unix id is targetPid)
    return exists sheet 1 of front window
  end tell
end run`;

const chooseScript = `on run argv
  set targetPid to item 1 of argv as integer
  set folderPath to item 2 of argv
  tell application "System Events" to tell (first process whose unix id is targetPid)
    set frontmost to true
    keystroke "g" using {command down, shift down}
    delay 0.5
    keystroke folderPath
    key code 36
    delay 0.5
    click button "Choose Folder" of splitter group 1 of sheet 1 of front window
  end tell
end run`;

async function chooseNativeFolder(pid: number, path: string): Promise<void> {
  await expect.poll(() => panelPresent(pid), { timeout: 15_000 }).toBe('true');
  await run('osascript', ['-e', chooseScript, String(pid), path], {
    timeout: 5000,
  });
}

async function panelPresent(pid: number): Promise<string> {
  const result = await run('osascript', ['-e', panelScript, String(pid)], {
    timeout: 5000,
  });

  return result.stdout.trim();
}

const usesNativePicker = (app: Pick<App, 'desktop'>): boolean =>
  Boolean(app.desktop) && process.platform === 'darwin';

const desktopPid = (app: Pick<App, 'desktop'>): number =>
  app.desktop?.application.process().pid ?? 0;
