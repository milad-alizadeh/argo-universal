import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { requests } from './conversation-requests';
import { Given, Then, When } from './fixtures';

const promptMethod = 'session/prompt';

const steeringMethod = '_session/steering';

const messageField = { name: 'Message', exact: true };

When(
  'I steer the Composer draft {string} with Cmd+Enter',
  async ({ page }, text: string): Promise<void> => {
    const field = page.getByRole('textbox', messageField);
    await field.fill(text);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeEnabled();
    await field.press('Meta+Enter');
    await expect(field).toHaveText('');
  },
);

Given('Agent {int} refuses steering into its held Turn', expectListedAgent);

When(
  'I try to steer the Composer draft {string}',
  async ({ page }, text: string): Promise<void> => {
    const field = page.getByRole('textbox', messageField);
    await field.fill(text);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeEnabled();
    await field.press('Meta+Enter');
  },
);

Then(
  'failed steering keeps the Composer draft {string}',
  async ({ page, app }, text: string): Promise<void> => {
    await expect(
      page.getByText('The Agent did not accept steering; your Prompt was kept'),
    ).toBeVisible();
    await expect(page.getByRole('textbox', messageField)).toHaveText(text);
    expect(requests(app.requestLogPath, steeringMethod)).toHaveLength(1);
    expect(requests(app.requestLogPath, promptMethod)).toHaveLength(1);
  },
);

Then(
  'unsupported steering keeps the Composer draft {string}',
  async ({ page, app }, text: string): Promise<void> => {
    await expect(
      page.getByText(
        'This Agent does not support steering; submit normally to queue the Prompt',
      ),
    ).toBeVisible();
    await expect(page.getByRole('textbox', messageField)).toHaveText(text);
    expect(requests(app.requestLogPath, steeringMethod)).toHaveLength(0);
  },
);

Then(
  'the Agent receives no steering request',
  async ({ app }): Promise<void> => {
    expect(requests(app.requestLogPath, steeringMethod)).toHaveLength(0);
  },
);

Then(
  'the steered image reaches the Agent with its original bytes',
  async ({ app }): Promise<void> => {
    const bytes = await readFile(
      path.resolve(import.meta.dirname, '../../mocks/agent/red-square.png'),
    );

    const [steered] = requests(app.requestLogPath, steeringMethod);

    expect(steered?.params?.prompt).toContainEqual(
      expect.objectContaining({
        type: 'image',
        mimeType: 'image/png',
        data: bytes.toString('base64'),
      }),
    );
  },
);

Then(
  'the Composer keeps the attached red square image',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('img', { name: 'red-square.png', exact: true }),
    ).toBeVisible();
  },
);
