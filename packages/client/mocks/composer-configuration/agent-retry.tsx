import { newSessionCatalogs } from '@repo/mocks/app';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ComposerAgentModelControl } from '../../src/features/composer/components/composer-configuration/composer-configuration';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  agentModelLabel,
  agentsList,
  chooseAgentLabel,
  type Story,
  type Configuration,
  type PlayContext,
} from './common';
import { assertUnavailableRows, assertRetryResults } from './retry-assertions';
import {
  retryCase,
  retryConfiguration,
  type RetryScenario,
} from './retry-case';

interface RetryProps {
  configuration: Configuration;
}

function useRetryingConfiguration(configuration: Configuration): Configuration {
  const [agents, setAgents] = useState(configuration.agents);

  const onAgentRetry = (): void => {
    configuration.onAgentRetry?.();
    setAgents(newSessionCatalogs.bothAvailable);
  };

  return { ...configuration, agents, onAgentRetry };
}

function RetryingConfiguration({
  configuration,
}: RetryProps): React.JSX.Element {
  const retrying = useRetryingConfiguration(configuration);

  return (
    <View className="p-4">
      <ComposerAgentModelControl disabled={false} configuration={retrying} />
    </View>
  );
}

export function unavailableAgentRetry(
  width: number,
  agentIndex: number,
  session: 'new' | 'started',
): Story {
  const scenario = retryScenario(width, agentIndex, session);

  return {
    beforeEach: () => clearRetryCallbacks(scenario),
    args: { configuration: retryConfiguration(scenario) },
    render: (args) => (
      <RetryingConfiguration configuration={args.configuration} />
    ),
    play: (context) => testAgentRetry(context, scenario),
  };
}

async function testAgentRetry(
  context: PlayContext,
  scenario: RetryScenario,
): Promise<void> {
  await settleViewport(scenario.width);
  await openAgentChoices(context);
  const retry = await assertUnavailableRows(scenario);
  await assertRetryRowsReachable(scenario.width);
  await context.userEvent.click(retry);
  await assertRetryResults(scenario);
  await context.userEvent.keyboard('{Escape}');
}

async function assertRetryRowsReachable(width: number): Promise<void> {
  if (width !== layoutWidths.wide) return;
  await waitFor(async () => {
    const menu = within(document.body)
      .getByRole('list', { name: agentsList })
      .getBoundingClientRect();

    for (const unavailable of newSessionCatalogs.bothUnavailable)
      await assertRetryRowInsideMenu(unavailable.label, menu);
  });
}

async function assertRetryRowInsideMenu(
  label: string,
  menu: DOMRect,
): Promise<void> {
  const overlay = within(document.body);

  const choice = overlay
    .getByRole('button', { name: `Select ${label}` })
    .getBoundingClientRect();

  const action = overlay
    .getByRole('button', { name: `Retry ${label}` })
    .getBoundingClientRect();

  await expect(choice.top).toBeGreaterThanOrEqual(menu.top);
  await expect(action.bottom).toBeLessThanOrEqual(menu.bottom);
}

function retryScenario(
  width: number,
  agentIndex: number,
  session: 'new' | 'started',
): RetryScenario {
  return {
    width,
    session,
    recorded: retryCase(agentIndex),
    onAgentChange: fn(),
    onAgentRetry: fn(),
  };
}

function clearRetryCallbacks(scenario: RetryScenario): void {
  scenario.onAgentChange.mockClear();
  scenario.onAgentRetry.mockClear();
}

async function openAgentChoices(context: PlayContext): Promise<void> {
  const overlay = within(document.body);
  await context.userEvent.click(
    context.canvas.getByRole('button', { name: agentModelLabel }),
  );
  await context.userEvent.click(
    await overlay.findByRole('button', { name: chooseAgentLabel }),
  );
}
