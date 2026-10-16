import { publishedRegistry } from '@repo/mocks/registry/catalog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { AgentListItem } from './agent-list-item';

const entry = publishedRegistry.agents[0];

if (!entry) throw new Error('Registry fixture needs an Agent');

const meta = {
  title: 'Agents/Agent card',
  component: AgentListItem,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <GroupedList>
        <GroupedListSection>
          <Story />
        </GroupedListSection>
      </GroupedList>
    ),
  ],
  args: {
    agent: { ...entry, installed: false, unavailable: false },
    onInstall: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof AgentListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Install: Story = {};

export const Remove: Story = {
  args: { agent: { ...meta.args.agent, installed: true } },
};

export const Unavailable: Story = {
  args: { agent: { ...meta.args.agent, unavailable: true } },
};
