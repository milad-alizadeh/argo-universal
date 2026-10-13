import { rename, writeFile } from 'node:fs/promises';
import type { Page, Locator } from '@playwright/test';
import { InstallationScenario } from '@repo/mocks/registry/installation';
import { z } from 'zod';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { query } from './server-query';
import { toast } from './toasts';

const heading = (page: Page, name: string): Locator =>
  page.getByRole('heading', { name, exact: true });
// Evidence for the PR: each state of the flow, as the user sees it.
const capture = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    animations: 'disabled',
  });
};
const failureMessage = (failure: string): string =>
  failure === 'missing-runtime'
    ? 'Node.js is required on the Server'
    : 'Fixture package download failed';

async function setInstallerScenario(
  path: string,
  scenario: z.infer<typeof InstallationScenario>,
): Promise<void> {
  await writeFile(`${path}.next`, JSON.stringify(scenario));
  await rename(`${path}.next`, path);
}

Given(
  'the external Agent installer is held',
  async ({ app }): Promise<void> => {
    await setInstallerScenario(app.installationPath, {
      outcome: 'success',
      released: false,
    });
  },
);
Given(
  'the external Agent installer reports {word}',
  async ({ app }, failure: string): Promise<void> => {
    await setInstallerScenario(
      app.installationPath,
      InstallationScenario.parse({ outcome: failure, released: true }),
    );
  },
);
const openInstallation = async (page: Page): Promise<Locator> => {
  await browseAgents(page);
  await page.getByRole('link', { name: /^Example Agent,/ }).click();
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  return page.getByRole('dialog', { name: 'Install Example Agent?' });
};
When('I confirm installing Example Agent', async ({ page }): Promise<void> => {
  const confirmation = await openInstallation(page);
  await expect(confirmation).toContainText('Version 1.2.3');
  await capture(page, 'agent-install-confirmation');
  await confirmation
    .getByRole('button', { name: 'Install', exact: true })
    .click();
});
When('I cancel installing Example Agent', async ({ page }): Promise<void> => {
  const confirmation = await openInstallation(page);
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
});
Then(
  'the Install button shows the installation in progress',
  async ({ page }): Promise<void> => {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Installing…', exact: true }),
    ).toBeDisabled();
    await capture(page, 'agent-install-in-progress');
  },
);
When(
  'the external Agent installer completes',
  async ({ app }): Promise<void> => {
    await setInstallerScenario(app.installationPath, {
      outcome: 'success',
      released: true,
    });
  },
);
Then(
  'Example Agent installation completes with readiness checked separately',
  async ({ page }): Promise<void> => {
    await expect(toast(page, 'Example Agent installed')).toBeVisible();
    await expect(
      toast(page, 'Version 1.2.3. Sign-in is checked separately.'),
    ).toBeVisible();
    await expect(toast(page, 'Ready')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Install(ing…)?$/ }),
    ).toHaveCount(0);
    await expect(heading(page, 'Example Agent')).toBeVisible();
    await capture(page, 'agent-install-completed');
  },
);
Then(
  'the installation explains {word} and offers another attempt',
  async ({ page }, failure: string): Promise<void> => {
    await expect(toast(page, 'Could not install Example Agent')).toBeVisible();
    await expect(toast(page, failureMessage(failure), false)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Install', exact: true }),
    ).toBeEnabled();
    await capture(page, 'agent-install-failed');
  },
);
const installationStatus = z.object({
  installation: z.object({ status: z.string() }),
  operation: z.object({ status: z.string() }).nullable(),
});
const readInstallation = (
  page: Page,
  httpUrl: string,
): Promise<z.infer<typeof installationStatus>> =>
  query({
    page,
    httpUrl,
    procedure: 'agents.installStatus',
    input: {
      agentId: z.string().parse(new URL(page.url()).pathname.split('/').at(-1)),
    },
    output: installationStatus,
  });
Then('no installation is started', async ({ page, server }): Promise<void> => {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Install', exact: true }),
  ).toBeEnabled();
  await expect(readInstallation(page, server.httpUrl)).resolves.toEqual({
    installation: { status: 'not-installed' },
    operation: null,
  });
});
