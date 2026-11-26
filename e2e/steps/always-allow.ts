import { execFile } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Page } from '@playwright/test';
import { scheduledReply } from '@repo/mocks/agent/schedule-grant-scenario';
import { z } from 'zod';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, Then, When } from './fixtures';
import { sessionOpenTimeout } from './new-session';
import { requestSurface } from './permission';
import { agentId } from './scenario-agents';
import { seedSession } from './seed-session';
import { mutate, query } from './server-query';

const otherProject = 'support-bot';

const git = promisify(execFile);

// A second repository the Server adds as a Project, as the person would from Settings.
async function otherRepository(): Promise<string> {
  const path = join(await mkdtemp(join(tmpdir(), 'argo-e2e-')), otherProject);

  await mkdir(path);
  await git('git', ['init', '-q', '-b', 'main'], { cwd: path });
  await git(
    'git',
    [
      '-c',
      'user.name=Argo',
      '-c',
      'user.email=argo@example.com',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'Start',
    ],
    { cwd: path },
  );

  return path;
}

const Projects = z.array(z.object({ id: z.string(), name: z.string() }));

Given('another Project has a Session', async ({ page, app }): Promise<void> => {
  await mutate({
    page,
    httpUrl: app.httpUrl,
    procedure: 'project.add',
    input: { path: await otherRepository() },
  });

  const projects = await query({
    page,
    httpUrl: app.httpUrl,
    procedure: 'project.list',
    input: {},
    output: Projects,
  });

  const target = projects.find(({ name }) => name === otherProject);

  if (!target) throw new Error('The other Project was not created');

  await seedSession(page, app.httpUrl, {
    projectId: target.id,
    agent: agentId(2),
    title: 'Support work',
  });
});

Given('Agent {int} schedules follow-ups in another Project', expectListedAgent);

// The Agent's CLI call reaches the Server from its own process, so it takes as long as a Session opening.
Then('the Schedule asks first', async ({ page }): Promise<void> => {
  await expect(
    requestSurface(page).getByRole('heading', {
      name: 'Schedule Prompt',
      exact: true,
    }),
  ).toBeVisible(sessionOpenTimeout);
});

Then(
  'the Permission request says what Always allow covers',
  async ({ page }): Promise<void> => {
    await expect(
      requestSurface(page).getByText(
        new RegExp(
          `Always allow lets Sessions started in .+ run Schedule Prompt in ${otherProject} without asking`,
        ),
      ),
    ).toBeVisible();
  },
);

When(
  'I answer the Permission request with Always allow',
  async ({ page }): Promise<void> => {
    const surface = requestSurface(page);

    await surface.getByRole('button', { name: 'Allow options' }).click();
    await page.getByRole('menuitemradio', { name: 'Always allow' }).click();
    await surface
      .getByRole('button', { name: 'Always allow', exact: true })
      .click();
  },
);

// Each Schedule is three CLI calls from the Agent's own process.
Then('both Schedules are made', async ({ page }): Promise<void> => {
  await expect(
    page.getByTestId('feed-scroll').getByText(scheduledReply, { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
});

Then(
  'the second Schedule ran without asking',
  async ({ page }): Promise<void> => {
    await expect(
      requestSurface(page).getByRole('heading', { name: 'Schedule Prompt' }),
    ).toHaveCount(0);
  },
);

const grantsSection = (page: Page): ReturnType<Page['getByRole']> =>
  page.getByRole('link', { name: /^Schedule Prompt/ });

When('I open Agent access', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /^Agent access(?:,|$)/ }).click();
});

Then(
  'Always allowed lists {string} from this Project into the other',
  async ({ page }, label: string): Promise<void> => {
    await expect(
      page.getByText('Always allowed', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(
      page.getByText(new RegExp(`→ ${otherProject}$`)),
    ).toBeVisible();
  },
);

When(
  'I revoke {string} and confirm',
  async ({ page }, label: string): Promise<void> => {
    await page.getByText(label, { exact: true }).click();

    const alert = page.getByRole('dialog');

    await expect(alert.getByText('Revoke Always allow?')).toBeVisible();
    await alert.getByRole('button', { name: 'Revoke', exact: true }).click();
  },
);

Then('Always allowed lists nothing', async ({ page }): Promise<void> => {
  await expect(grantsSection(page)).toHaveCount(0);
  await expect(
    page.getByText(/When you choose Always allow on a Permission request/),
  ).toBeVisible();
});
