import { rename, writeFile } from 'node:fs/promises';
import type { Page, Locator } from '@playwright/test';
import { InstallationScenario } from '@repo/mocks/registry/installation';
import { z } from 'zod';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then } from './fixtures';
import { query } from './server-query';

const heading = (page: Page, name: string): Locator =>
  page.getByRole('heading', { name, exact: true });
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
When('I confirm installing Example Agent', async ({ page }): Promise<void> => {
  await browseAgents(page);
  await page.getByRole('link', { name: /^Example Agent,/ }).click();
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Install Example Agent?',
  );
  await page
    .getByRole('button', { name: 'Install', exact: true })
    .last()
    .click();
});
Then(
  'the installation keeps its title and disables the loading Install button',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Install', exact: true }).last(),
    ).toBeDisabled();
    await expect(page.getByRole('dialog')).toContainText(
      'Install Example Agent?',
    );
    await expect(
      page.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible();
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
    await expect(page.getByRole('dialog')).toContainText(
      'Example Agent installed',
    );
    await expect(
      page.getByText('Version 1.2.3 is installed.', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText(/Installation alone does not mean ready/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(heading(page, 'Example Agent')).toBeVisible();
  },
);
Then(
  'the installation explains {word} and offers another attempt',
  async ({ page }, failure: string): Promise<void> => {
    await expect(
      page.getByRole('dialog', { name: 'Installation failed', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(failureMessage(failure), { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Try again', exact: true }),
    ).toBeVisible();
  },
);
When('I cancel the Agent installation', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
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
Then(
  'no new installation is activated',
  async ({ page, server }): Promise<void> => {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Install', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => readInstallation(page, server.httpUrl))
      .toEqual({
        installation: { status: 'not-installed' },
        operation: { status: 'cancelled' },
      });
  },
);
