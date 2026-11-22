import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, Then, When } from './fixtures';
import { toast } from './toasts';

const execute = promisify(execFile);

const ready = 'Ready for Terminal input';

const typed = 'argo-input';

const runFile = '.argo/run.json';

const web = 'web';

const rows = (page: Page): Locator => page.getByTestId('session-workbench');

const inspector = (page: Page): Locator =>
  page.getByRole('tabpanel', { name: web, exact: true });

const terminal = (page: Page): Locator =>
  inspector(page).getByRole('region', { name: 'web Terminal' });

Given(
  'the Project has a Run Configuration that reads Terminal input',
  async ({ app }) => {
    const directory = join(app.projectPath, '.argo');
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'run.json'),
      JSON.stringify({
        configurations: [
          {
            name: web,
            command: `printf '${ready}\\n'; IFS= read -r value; printf 'Received %s\\n' "$value"; sleep 60`,
            ready: { pattern: ready },
          },
        ],
      }),
    );

    const git = { cwd: app.projectPath };

    await execute('git', ['add', '.argo/run.json'], git);
    await execute(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        'commit',
        '-qm',
        'Run Configuration',
      ],
      git,
    );
    await execute(
      'git',
      ['update-ref', 'refs/remotes/origin/main', 'HEAD'],
      git,
    );
  },
);

When('I start the web Run from the Workbench', async ({ page }) => {
  const start = rows(page).getByRole('button', { name: 'Start web' });

  await expect(start).toBeVisible();
  await start.click();
  await expect(rows(page).getByText(/Ready ·/u)).toBeVisible();
});

When('I open the web Run Terminal', async ({ page }) => {
  await rows(page).getByRole('button', { name: 'Open web Terminal' }).click();
  await expect(terminal(page)).toContainText(ready);
});

When('I type into the web Run Terminal', async ({ page }) => {
  await terminal(page).locator('.xterm').click();
  await page.keyboard.type(typed);
  await page.keyboard.press('Enter');
});

Then("the web Run Terminal shows the command's response", async ({ page }) => {
  await expect(terminal(page)).toContainText(`Received ${typed}`);
});

When('I stop web from its Run Inspector', async ({ page }) => {
  await inspector(page).getByRole('button', { name: 'Stop web' }).click();
});

Then('the Run Inspector shows web stopped', async ({ page }) => {
  await expect(
    inspector(page).getByText('Stopped', { exact: true }),
  ).toBeVisible();
  await expect(
    inspector(page).getByRole('button', { name: 'Stop web' }),
  ).toBeDisabled();
});

When(
  'I try to draft a Run Configuration without a source',
  async ({ page }) => {
    await rows(page)
      .getByRole('button', { name: `Create ${runFile}` })
      .click();
    await expect(
      toast(page, 'the template from run.guide', false),
    ).toBeVisible();
  },
);

When('I write a Run Configuration without a command', async ({ app }) => {
  await mkdir(join(app.projectPath, '.argo'), { recursive: true });
  await writeFile(
    join(app.projectPath, runFile),
    JSON.stringify({ configurations: [{ name: web }] }),
  );
});

Then(
  'the Runs notification identifies the missing command',
  async ({ page }) => {
    await expect(toast(page, 'configurations.0.command', false)).toBeVisible();
  },
);

When('I correct the Run Configuration', async ({ app }) => {
  await writeFile(
    join(app.projectPath, runFile),
    JSON.stringify({ configurations: [{ name: web, command: 'echo ready' }] }),
  );
});

Then('the Workbench offers to start web', async ({ page }) => {
  await expect(
    rows(page).getByRole('button', { name: 'Start web' }),
  ).toBeVisible();
});
