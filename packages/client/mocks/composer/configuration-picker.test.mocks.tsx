import { type AgentServer } from '@repo/contracts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { within, expect, fn, waitFor } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { composerProps, updateComposerSettings } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import { agentModelLabel } from './composer-test-contract.test.mocks';
import {
  expectHighEffort,
  expectEffortFollowsModel,
  expectDangerousMode,
} from './configuration-expectations.test.mocks';
import { pickerCatalogs } from './recorded-catalog.test.mocks';

export function pickers(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];

  if (!catalog)
    throw new Error(`Recorded catalog needs an Agent at index ${agentIndex}.`);

  return {
    parameters: { screenPreview: true },
    render: () => (
      <View className="flex-1 justify-end">
        <ConfiguredComposer agent={catalog.agent} />
      </View>
    ),
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleLayout(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      await waitFor(async () =>
        expect(
          await overlay.findByRole('slider', { name: 'Effort' }),
        ).toBeVisible(),
      );
      await expectHighEffort({ canvas, userEvent, width, catalog });

      for (const model of catalog.models)
        await expectEffortFollowsModel({ canvas, userEvent, width, model });
      await userEvent.keyboard('{Escape}');
      await expectDangerousMode({ canvas, userEvent, width, catalog });
    },
  };
}

function ConfiguredComposer({
  agent,
}: {
  agent: AgentServer;
}): React.JSX.Element {
  const [configOptions, setConfigOptions] = useState(
    recordedSessionOptions(agent.id),
  );

  return (
    <Composer
      {...composerProps({
        draft: { text: '', attachments: [] },
        onDraftChange: fn(),
        onSend: fn(),
        onAttachImages: fn(),
        configuration: {
          agent,
          configOptions,
          onConfigChange: (configId, value) =>
            setConfigOptions((options) =>
              updateComposerSettings(options, configId, value),
            ),
          checkout: { branch: 'main', newWorktree: false },
        },
      })}
    />
  );
}
