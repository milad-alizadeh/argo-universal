import type { Locator, Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';
import { sessionRow } from './live-session';
import { query } from './server-query';

const titlePrefix = 'Long list Session';

const indexWidth = 3;

// Far above any page size, so a broken cursor fails instead of hanging.
const seedLimit = 500;

const SessionPage = z.object({ nextCursor: z.string().nullable() });

const Projects = z.array(z.object({ id: z.string() }));

function title(index: number): string {
  return `${titlePrefix} ${String(index).padStart(indexWidth, '0')}`;
}

function row(page: Page, index: number): Locator {
  return sessionRow(page, title(index));
}

async function firstProjectId(page: Page, httpUrl: string): Promise<string> {
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

type SeededSession = { projectId: string; agent: string; title: string };

// The body of a `session.new` call that starts on the main checkout.
type SessionNewBody = {
  projectId: string;
  agent: string;
  checkout: { type: 'main' };
  configOptions: [];
  prompt: { type: 'text'; text: string }[];
};

function newSessionInput(session: SeededSession): SessionNewBody {
  return {
    projectId: session.projectId,
    agent: session.agent,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: session.title }],
  };
}

async function startSession(
  page: Page,
  httpUrl: string,
  session: SeededSession,
): Promise<void> {
  const response = await page.request.post(`${httpUrl}/trpc/session.new`, {
    headers: { origin: 'app://app' },
    data: newSessionInput(session),
  });

  expect(response.ok()).toBe(true);
}

// True once the Sessions list no longer fits on its first page.
async function hasSecondPage(page: Page, httpUrl: string): Promise<boolean> {
  const { nextCursor } = await query({
    page,
    httpUrl,
    procedure: 'session.list',
    input: {},
    output: SessionPage,
  });

  return nextCursor !== null;
}

async function seedSessions(page: Page, httpUrl: string): Promise<void> {
  const projectId = await firstProjectId(page, httpUrl);
  const { id: agent } = await readAgent(page, httpUrl, 1);

  for (let index = 1; index <= seedLimit; index += 1) {
    if (await hasSecondPage(page, httpUrl)) return;

    await startSession(page, httpUrl, {
      projectId,
      agent,
      title: title(index),
    });
  }

  throw new Error(`Sessions list fits one page after ${seedLimit}`);
}

Given(
  'more long-list Sessions than fit one page',
  async ({ page, server }): Promise<void> => {
    await seedSessions(page, server.httpUrl);
    await reloadApp(page);
  },
);

When(
  'I scroll the Sessions list to the end',
  async ({ page }): Promise<void> => {
    const list = page.getByTestId('sessions-scroll');
    // The first page holds the newest Sessions, so the oldest is not loaded yet.
    await expect(row(page, 1)).toHaveCount(0);
    await expect
      .poll(async () => {
        await list.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });

        return row(page, 1).count();
      })
      .toBe(1);
  },
);

Then(
  'the Sessions list shows the oldest Session',
  async ({ page }): Promise<void> => {
    // The oldest Session is on the second page, so seeing it proves the list loaded more.
    await expect(row(page, 1)).toBeVisible();
  },
);
