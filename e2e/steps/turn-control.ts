import type { Locator, Page } from '@playwright/test';
import { sharedReply } from '@repo/mocks/agent/scenarios';
import { expect } from '../fixtures';
import {
  type LoggedMessage,
  type LoggedRequest,
  answeredAt,
  loggedMessages,
  receivedAt,
  releaseAgent,
  requests,
  requestsIn,
} from './agent-requests';
import { expectListedAgent } from './agents';
import { readFeed } from './feed';
import { Given, When, Then } from './fixtures';
import { expectMessage, messageLabel } from './new-session';

const promptMethod = 'session/prompt';

type PromptPair = { held: LoggedRequest; next: LoggedRequest };

// The held first prompt and the prompt sent after it.
const promptPair = (messages: LoggedMessage[]): PromptPair => {
  const [held, next] = requestsIn(messages, promptMethod);

  if (!held || !next)
    throw new Error('The Agent received fewer than two prompts');

  return { held, next };
};

const stopButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Stop', exact: true });

Given('Agent {int} holds its first Turn until released', expectListedAgent);

When('I stop the Turn', async ({ page }): Promise<void> => {
  await stopButton(page).click();
});

const stopReasons = async (page: Page, httpUrl: string): Promise<unknown[]> =>
  (await readFeed(page, httpUrl)).map(
    (row) => row._meta.argo.turnEnd?.stopReason,
  );

const expectStoppedTurn = async (
  page: Page,
  httpUrl: string,
): Promise<void> => {
  await expect.poll(() => stopReasons(page, httpUrl)).toContain('cancelled');
};

// The Agent was told to cancel but has not answered the stopped prompt.
const expectPromptStillHeld = async (requestLogPath: string): Promise<void> => {
  await expect
    .poll(() => requests(requestLogPath, 'session/cancel'))
    .toHaveLength(1);

  const messages = loggedMessages(requestLogPath);
  const [stopped] = requestsIn(messages, promptMethod);

  expect(stopped && answeredAt(messages, stopped)).toBe(-1);
};

// The Turn ended at once: the Composer is back while the Agent has not answered the stopped prompt.
Then(
  'the Composer is ready while the Agent still holds the stopped prompt',
  async ({ page, app, server }): Promise<void> => {
    await expectStoppedTurn(page, server.httpUrl);
    await expect(stopButton(page)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: messageLabel }),
    ).toBeEditable();
    await expectPromptStillHeld(app.requestLogPath);
  },
);

// The Send waits for the stopped prompt's answer: the prompt stays in the Composer and never reaches the Agent.
Then(
  'the Composer holds {string} until the Agent answers',
  async ({ page, app }, prompt: string): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Send', exact: true }),
    ).toBeDisabled();
    await expectMessage(page, prompt);
    expect(requests(app.requestLogPath, promptMethod)).toHaveLength(1);
  },
);

When('the Agent answers its held prompt', async ({ app }): Promise<void> => {
  releaseAgent(app.requestLogPath);
});

Then(
  'the Agent receives the next prompt only after answering the held one',
  async ({ page, app }): Promise<void> => {
    await expect(
      page.getByTestId('feed-scroll').getByText(sharedReply, { exact: true }),
    ).toBeVisible();

    await expectMessage(page, '');

    const messages = loggedMessages(app.requestLogPath);
    const { held, next } = promptPair(messages);

    const heldAnswer = answeredAt(messages, held);

    expect(heldAnswer).toBeGreaterThan(receivedAt(messages, held));
    expect(heldAnswer).toBeLessThan(receivedAt(messages, next));
  },
);

const expectModelSwitch = (messages: LoggedMessage[], model: string): void => {
  const { held, next } = promptPair(messages);

  const switches = requestsIn(messages, 'session/set_config_option')
    .filter((request) => request.agent === held.agent)
    .filter(
      (request) =>
        request.params?.configId === 'model' &&
        receivedAt(messages, request) > receivedAt(messages, held),
    );

  expect(switches.map((request) => request.params?.value)).toEqual([model]);

  const switchedAt = switches.map((request) => receivedAt(messages, request));

  expect(switchedAt[0]).toBeGreaterThan(answeredAt(messages, held));
  expect(switchedAt[0]).toBeLessThan(receivedAt(messages, next));
};

// The model chosen during the held Turn reaches the Agent once, between that Turn's answer and the next prompt.
Then(
  'the Agent switches to model {string} before the next prompt',
  async ({ page, app }, model: string): Promise<void> => {
    await expect(
      page.getByTestId('feed-scroll').getByText(sharedReply, { exact: true }),
    ).toBeVisible();

    expectModelSwitch(loggedMessages(app.requestLogPath), model);
  },
);
