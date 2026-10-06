import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const phone = { width: 390, height: 844 };
const agents = [
  { agent: 'claude', label: 'Claude' },
  { agent: 'codex', label: 'Codex' },
] as const;
const imagePath = path.resolve(
  import.meta.dirname,
  '../../mocks/cli/red-square.png',
);

type FeedRow = { sessionUpdate: string; content?: unknown[] };

// The Session's first Feed rows, read from the Server as any client reads them.
async function readFeed(page: Page, httpUrl: string, sessionId: string) {
  const input = encodeURIComponent(
    JSON.stringify({ sessionId, direction: 'tail' }),
  );
  const response = await page.request.get(
    `${httpUrl}/trpc/feed.page?input=${input}`,
  );
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    result: { data: { rows: FeedRow[] } };
  };
  return body.result.data.rows;
}

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

for (const { agent, label } of agents) {
  test(`${label}: a text prompt starts a Session, and Back returns to the list`, async ({
    page,
    ownServer,
  }) => {
    await page.setViewportSize(phone);
    const { httpUrl } = await ownServer();
    await openNewSession(page);
    await chooseAgent(page, label);
    await page
      .getByRole('textbox', { name: 'Message' })
      .fill('Fix the flaky login test');
    const sessionId = await send(page);

    const [prompt] = await readFeed(page, httpUrl, sessionId);
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

  test(`${label}: an image prompt uploads the image and starts a Session`, async ({
    page,
    ownServer,
  }) => {
    await page.setViewportSize(phone);
    const { httpUrl } = await ownServer({
      [agent]: { recording: 'image-prompt' },
    });
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
    const [prompt] = await readFeed(page, httpUrl, sessionId);
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
    const stored = await page.request.get(`${httpUrl}/blobs/${blobId}`);
    expect(Buffer.from(await stored.body())).toEqual(image);
  });
}

test('the checkout choice is remembered for the next New Session', async ({
  page,
  ownServer,
}) => {
  await page.setViewportSize(phone);
  await ownServer();
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
  not_installed: {
    status: 'Not installed',
    setup: 'Install',
    claude: 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
  },
  not_signed_in: {
    status: 'Not signed in',
    setup: 'Sign in',
    claude:
      'Run claude in a terminal and sign in with /login using a Claude subscription',
  },
} as const;

for (const availability of ['not_installed', 'not_signed_in'] as const) {
  const { status, claude } = steps[availability];
  test(`with every Agent ${status.toLowerCase()}, New Session shows the first Agent's step`, async ({
    page,
    ownServer,
  }) => {
    await page.setViewportSize(phone);
    await ownServer(
      Object.fromEntries(agents.map(({ agent }) => [agent, { availability }])),
    );
    await openNewSession(page);
    await expect(page.getByRole('alert')).toHaveText(claude);
    await expect(
      page.getByRole('textbox', { name: 'Message' }),
    ).not.toBeEditable();
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
}

for (const [unavailable, availability] of [
  [agents[0], 'not_installed'],
  [agents[1], 'not_signed_in'],
] as const) {
  const { status, setup } = steps[availability];
  test(`${unavailable.label} ${status.toLowerCase()}: the Agent picker marks it and opens its setup`, async ({
    page,
    ownServer,
  }) => {
    await page.setViewportSize(phone);
    await ownServer({ [unavailable.agent]: { availability } });
    await openNewSession(page);
    await page.getByRole('button', { name: 'Agent and model' }).click();
    await page.getByRole('button', { name: 'Choose Agent' }).click();
    const select = page.getByRole('button', {
      name: `Select ${unavailable.label}`,
    });
    await expect(select).toContainText(status);
    await expect(select).toBeDisabled();
    const setUp = page.getByRole('button', {
      name: `Set up ${unavailable.label}`,
    });
    await expect(setUp).toHaveText(setup);
    await setUp.click();
    await expect(page).toHaveURL(
      new RegExp(`/settings/agents/${unavailable.agent}$`),
    );
  });
}
