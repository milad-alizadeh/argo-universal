import { List, ListSection } from '@repo/kit/primitives/lists/list';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { AgentListItem } from './agent-list-item';
import {
  installableAgent,
  installedAgent,
  unavailableAgent,
} from './agent-list-item-fixtures';

const meta = {
  title: 'Agents/AgentListItem',
  component: AgentListItem,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <List appearance="grouped">
        <ListSection>
          <Story />
        </ListSection>
      </List>
    ),
  ],
  args: { ...installableAgent, onInstall: fn(), onRemove: fn() },
  argTypes: {
    agent: { control: false },
    onInstall: { control: false },
    onRemove: { control: false },
  },
} satisfies Meta<typeof AgentListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// Not installed: the card's trailing action adds the Agent.
export const Install: Story = { args: installableAgent };

// Installed: the same place holds Remove, in the danger tone.
export const Remove: Story = { args: installedAgent };

// Unavailable here: desktop names the status in words, a phone draws its glyph.
export const Unavailable: Story = { args: unavailableAgent };
