import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { SectionModal } from '@repo/kit/primitives/scaffolds/section-modal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { fn } from 'storybook/test';
import { ScaffoldMock } from '../../features/frame/scaffold/scaffold.mocks';
import { AgentListView } from './agents/agent-list-view';
import { pageRows } from './agents/agent-list-view.mocks';
import agentMeta from './agents/agent-list-view.stories';
import { ConversationDetailView } from './conversation/conversation-detail-view';
import conversationMeta from './conversation/conversation-detail-view.stories';
import { SettingsListView } from './settings-list/settings-list-view';
import { readySettings } from './settings-list/settings-list-view-fixtures';

const meta = {
  title: 'Screens/Settings/Settings modal',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Page = 'agents' | 'conversation';

function SettingsPreview({ page }: { page: Page }): ReactElement {
  const list = (
    <Screen title="Settings" search={{ label: 'Search Settings' }}>
      <SettingsListView
        {...readySettings}
        selectedPath={`/settings/${page}`}
        onSelect={fn()}
        onThemeChange={fn()}
      />
    </Screen>
  );

  const detail =
    page === 'agents' ? (
      <AgentListView {...agentMeta.args} agents={pageRows()} />
    ) : (
      <ConversationDetailView {...conversationMeta.args} />
    );

  return (
    <>
      <ScaffoldMock selectedSection="sessions" />
      <SectionModal label="Settings" list={list} onClose={fn()}>
        {detail}
      </SectionModal>
    </>
  );
}

export const Agents: Story = {
  render: () => <SettingsPreview page="agents" />,
};

export const Conversation: Story = {
  render: () => <SettingsPreview page="conversation" />,
};
