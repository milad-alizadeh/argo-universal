import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { action } from 'storybook/actions';
import {
  ComposerDetailView,
  type ComposerDetailViewProps,
} from './composer-detail-view';
import { suggestionModels } from './composer-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Composer',
  component: ComposerDetailView,
  render: (args): React.JSX.Element => <ComposerWithState {...args} />,
  argTypes: {
    suggestionModels: { control: false },
    followUpSuggestions: { control: 'boolean' },
  },
  parameters: { screenPreview: true },
  args: {
    followUpSuggestions: true,
    suggestionModels,
    onFollowUpSuggestionsChange: action('choose Follow-up suggestions'),
    onSuggestionModelChange: action('choose suggestion model'),
  },
} satisfies Meta<typeof ComposerDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

function ComposerWithState(args: ComposerDetailViewProps): React.JSX.Element {
  const [enabled, setEnabled] = useState(args.followUpSuggestions);
  const [models, setModels] = useState(args.suggestionModels);

  return (
    <ComposerDetailView
      {...args}
      followUpSuggestions={enabled}
      onFollowUpSuggestionsChange={(next) => {
        setEnabled(next);
        args.onFollowUpSuggestionsChange?.(next);
      }}
      suggestionModels={models}
      onSuggestionModelChange={(id, choice) => {
        setModels((current) =>
          current?.map((agent) =>
            agent.id === id ? { ...agent, choice } : agent,
          ),
        );
        args.onSuggestionModelChange?.(id, choice);
      }}
    />
  );
}

export const Composer: Story = {};

export const SuggestionsOff: Story = { args: { followUpSuggestions: false } };

export const NoAgentsYet: Story = { args: { suggestionModels: undefined } };
