import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { mockClis } from '@repo/mocks/cli';
import { z } from 'zod';
import { expect, test } from '../fixtures';

const phone = { width: 390, height: 844 };
// The Agent ids the Server registers, so no test names a vendor (AGENTS.md).
const agentIds = Object.keys(mockClis);
const imagePath = path.resolve(
  import.meta.dirname,
  '../../mocks/cli/red-square.png',
);

const AgentsList = z.array(
  z.object({
    agent: z.string(),
    label: z.string(),
    installStep: z.string().optional(),
  }),
);
const FeedPage = z.object({
  rows: z.array(
    z.object({ sessionUpdate: z.string(), content: z.array(z.unknown()) }),
  ),
});

// Calls a tRPC query over HTTP, as any client may, and checks the answer's shape.
async function query<Output>({
  page,
  httpUrl,
  procedure,
  input,
  output,
}: {
  page: Page;
  httpUrl: string;
  procedure: string;
  input: unknown;
  output: z.ZodType<Output>;
}) {
  // A reused keep-alive socket can meet the Server closing it after 5 s idle; Playwright retries only ECONNRESET.
  const response = await page.request.get(
    `${httpUrl}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`,
    { maxRetries: 2 },
  );
  expect(response.ok()).toBe(true);
  return z
    .object({ result: z.object({ data: output }) })
    .parse(await response.json()).result.data;
}

const readAgents = (page: Page, httpUrl: string) =>
  query({
    page,
    httpUrl,
    procedure: 'agents.list',
    input: {},
    output: AgentsList,
  });

async function readAgent(page: Page, httpUrl: string, agent: string) {
  const found = (await readAgents(page, httpUrl)).find(
    (entry) => entry.agent === agent,
  );
  if (!found) throw new Error(`The Server has no Agent ${agent}`);
  return found;
}

// The Session's Session updates, newest page, read from the Server.
const readFeed = async (page: Page, httpUrl: string, sessionId: string) =>
  (
    await query({
      page,
      httpUrl,
      procedure: 'feed.page',
      input: { sessionId, direction: 'tail' },
      output: FeedPage,
    })
  ).rows;

async function chooseAgent(page: Page, label: string) {
  await page.getByRole('button', { name: 'Agent and model' }).click();
  await page.getByRole('button', { name: 'Choose Agent' }).click();
  await page.getByRole('button', { name: `Select ${label}` }).click();
  // A phone returns to the Agent and model sheet, which shows the choice.
  await expect(
    page.getByRole('button', { name: 'Choose Agent' }),
  ).toContainText(label);
  await page.keyboard.press('Escape');
}

// Sends the draft and returns the Session that replaced the New Session page.
async function send(page: Page) {
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/sessions\/(?!new)[^/]+$/);
  const sessionId = new URL(page.url()).pathname.split('/').pop();
  if (!sessionId) throw new Error('No Session id in the URL');
  return sessionId;
}

async function openNewSession(page: Page) {
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  await expect(page.getByRole('img', { name: 'Connected' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
}

for (const agent of agentIds) {
  test(`${agent}: a text prompt starts a Session, and Back returns to the list`, async ({
    page,
    server,
  }) => {
    await page.setViewportSize(phone);
    const { label } = await readAgent(page, server.httpUrl, agent);
    await openNewSession(page);
    await chooseAgent(page, label);
    await page
      .getByRole('textbox', { name: 'Message' })
      .fill('Fix the flaky login test');
    const sessionId = await send(page);

    const [prompt] = await readFeed(page, server.httpUrl, sessionId);
    expect(prompt).toMatchObject({
      sessionUpdate: 'user_message',
      content: [{ type: 'text', text: 'Fix the flaky login test' }],
    });

    // Sending replaced New Session, so Back skips it.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 1, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('No Sessions yet.', { exact: true }),
    ).toHaveCount(0);
  });

  test.describe(`${agent} with an image prompt recording`, () => {
    test.use({ mockAgents: { [agent]: { recording: 'image-prompt' } } });

    test(`${agent}: an image prompt uploads the image and starts a Session`, async ({
      page,
      server,
    }) => {
      await page.setViewportSize(phone);
      const { label } = await readAgent(page, server.httpUrl, agent);
      await openNewSession(page);
      await chooseAgent(page, label);
      await page.getByRole('button', { name: 'Attach images' }).click();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Photos' }).click();
      await (await chooser).setFiles(imagePath);
      await expect(
        page.getByRole('img', { name: 'red-square.png' }),
      ).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Message' })
        .fill('Name the dominant color in this image.');
      const sessionId = await send(page);

      const image = await readFile(imagePath);
      const blobId = createHash('sha256').update(image).digest('hex');
      const [prompt] = await readFeed(page, server.httpUrl, sessionId);
      expect(prompt).toMatchObject({
        sessionUpdate: 'user_message',
        content: [
          { type: 'text', text: 'Name the dominant color in this image.' },
          {
            type: 'image',
            mimeType: 'image/png',
            blob: { blobId, mime: 'image/png', bytes: image.byteLength },
          },
        ],
      });
      const stored = await page.request.get(
        `${server.httpUrl}/blobs/${blobId}`,
      );
      expect(Buffer.from(await stored.body())).toEqual(image);
    });
  });
}

test('the checkout choice is remembered for the next New Session', async ({
  page,
}) => {
  await page.setViewportSize(phone);
  await openNewSession(page);
  const checkout = page.getByRole('button', { name: 'Checkout' });
  await expect(checkout).toHaveText(/New worktree from\s*main/);
  await checkout.click();
  await page.getByRole('button', { name: 'Local' }).click();
  await expect(checkout).toHaveText(/Local/);
  await page.getByRole('textbox', { name: 'Message' }).fill('Tidy the README');
  await send(page);

  await page.goBack();
  await openNewSession(page);
  await expect(checkout).toHaveText(/Local/);
});

const steps = {
  not_installed: { status: 'Not installed', setup: 'Install' },
  not_signed_in: { status: 'Not signed in', setup: 'Sign in' },
} as const;

for (const availability of ['not_installed', 'not_signed_in'] as const) {
  const { status } = steps[availability];
  test.describe(`with every Agent ${status.toLowerCase()}`, () => {
    test.use({
      mockAgents: Object.fromEntries(
        agentIds.map((agent) => [agent, { availability }]),
      ),
    });

    test(`New Session shows the first Agent's step`, async ({
      page,
      server,
    }) => {
      await page.setViewportSize(phone);
      const [first, ...rest] = await readAgents(page, server.httpUrl);
      // Every Agent reports a step of its own.
      for (const agent of [first, ...rest])
        expect(agent?.installStep).toBeTruthy();
      await openNewSession(page);
      await expect(page.getByRole('alert')).toHaveText(
        first?.installStep ?? '',
      );
      await expect(
        page.getByRole('textbox', { name: 'Message' }),
      ).not.toBeEditable();
      await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
    });
  });
}

// One Agent unavailable while the other is ready, each variant on a different Agent.
for (const [index, availability] of [
  [0, 'not_installed'],
  [1, 'not_signed_in'],
] as const) {
  const agent = agentIds[index] ?? '';
  const { status, setup } = steps[availability];
  test.describe(`${agent} ${status.toLowerCase()}`, () => {
    test.use({ mockAgents: { [agent]: { availability } } });

    test('the Agent picker marks it and opens its setup', async ({
      page,
      server,
    }) => {
      await page.setViewportSize(phone);
      const { label } = await readAgent(page, server.httpUrl, agent);
      await openNewSession(page);
      await page.getByRole('button', { name: 'Agent and model' }).click();
      await page.getByRole('button', { name: 'Choose Agent' }).click();
      const select = page.getByRole('button', { name: `Select ${label}` });
      await expect(select).toContainText(status);
      await expect(select).toBeDisabled();
      const setUp = page.getByRole('button', { name: `Set up ${label}` });
      await expect(setUp).toHaveText(setup);
      await setUp.click();
      await expect(page).toHaveURL(new RegExp(`/settings/agents/${agent}$`));
    });
  });
}
