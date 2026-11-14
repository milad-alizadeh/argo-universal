import type { Page } from '@playwright/test';
import { z } from 'zod';
import { pullRequests, repository } from '../github-pulls';
import { Given } from './fixtures';
import { mutate, query } from './server-query';

const sessionIdOf = (page: Page): string => {
  const path = new URL(page.url()).pathname;
  const [, id] = /\/sessions\/([^/?#]+)$/.exec(path) ?? [];

  if (!id) throw new Error(`No Session is open at ${page.url()}`);

  return id;
};

const Projects = z.array(z.object({ id: z.string() }));

type Served = { page: Page; httpUrl: string };

async function firstProjectId({ page, httpUrl }: Served): Promise<string> {
  const [project] = await query({
    page,
    httpUrl,
    procedure: 'project.list',
    input: {},
    output: Projects,
  });

  if (!project) throw new Error('The Server has no Project');

  return project.id;
}

// What an Agent's `attach` does for the Session: the Operation, run for its Project and Session.
type AttachRun = {
  pluginId: string;
  operation: string;
  args: { reference: string };
  projectId: string;
  sessionId: string;
};

const attachInput = (
  page: Page,
  projectId: string,
  number: number,
): AttachRun => ({
  pluginId: 'github',
  operation: 'attach',
  args: { reference: `${repository}#${number}` },
  projectId,
  sessionId: sessionIdOf(page),
});

const attach = (
  served: Served,
  projectId: string,
  number: number,
): Promise<void> =>
  mutate({
    ...served,
    procedure: 'plugins.run',
    input: attachInput(served.page, projectId, number),
  });

// The fixture Account exists once its Plugin has started, which running it does.
const wakeAccount = (served: Served): Promise<void> =>
  mutate({
    ...served,
    procedure: 'plugins.run',
    input: { pluginId: 'github-account', operation: 'ready', args: {} },
  });

// The Session the page has open gets the pull requests the fixture holds, as an Agent would attach them.
Given(
  'the Session has the four fixture pull requests attached',
  async ({ page, server }): Promise<void> => {
    const served = { page, httpUrl: server.httpUrl };
    const projectId = await firstProjectId(served);

    await wakeAccount(served);

    for (const { number } of pullRequests)
      await attach(served, projectId, number);
  },
);
