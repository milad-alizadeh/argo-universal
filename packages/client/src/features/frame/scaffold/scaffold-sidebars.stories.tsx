import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { action } from 'storybook/actions';
import { SessionsPreviewMock } from '../../../../mocks/sessions-preview-mock';
import { pluginSectionId } from '../../../lib/product/navigation/sections';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import { issueFilters } from '../../../screens/plugins/$path/plugin-detail-view-fixtures';
import { scheduledListFixture } from '../../../screens/scheduled/scheduled-fixtures';
import { ScheduledListView } from '../../../screens/scheduled/scheduled-list-view';
import { Sessions as sessions } from '../../../screens/sessions/session-list-view-fixtures';
import { loadedSessionListView } from '../../../screens/sessions/session-list-view.mocks';
import { SettingsListView } from '../../../screens/settings/settings-list/settings-list-view';
import { readySettings } from '../../../screens/settings/settings-list/settings-list-view-fixtures';
import {
  FrameListDetailOffers,
  SectionListDetail,
  useFrameListDetail,
} from '../frame/frame-list-detail';
import type { SectionLists } from '../frame/section-lists';
import { sectionScaffold } from '../frame/section-scaffold';
import { wideScaffold } from './scaffold-fixtures';
import { ScaffoldMock } from './scaffold.mocks';

// The Frame's sidebar holding each section's real list, so every sidebar's heading, section headings and rows are seen side by side.
const meta = {
  title: 'Frame/Scaffold/Sidebars',
  component: ScaffoldMock,
  // The stories draw fixed sections; the Scaffold's own props table is on Frame/Scaffold.
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  args: wideScaffold,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

type Story = StoryObj<typeof meta>;

const sessionCallbacks = {
  onSelect: action('select Session'),
  onRename: action('rename Session'),
  onArchive: action('archive Session'),
  onArchiveMany: action('archive selected Sessions'),
  onNewSession: action('new Session'),
  onNewSessionInProject: action('new Session in Project'),
  onProjectSettings: action('Project settings'),
  onLoadMore: action('load next page'),
  onQueryChange: action('search Sessions'),
};

// The Sessions list: its search, filter and New Session in the heading, and Projects as sidebar sections.
export const Sessions: Story = {
  args: {
    selectedSection: 'sessions',
    list: (
      <SessionsPreviewMock
        {...loadedSessionListView}
        {...sessionCallbacks}
        {...sessions}
      />
    ),
  },
};

// The Scheduled list: New Schedule in the heading, and Active and Paused as sidebar sections.
export const Scheduled: Story = {
  args: {
    selectedSection: 'scheduled',
    list: (
      <ScheduledListView
        {...scheduledListFixture}
        onCreate={action('new Schedule')}
        onOpen={action('open Schedule')}
      />
    ),
  },
};

// The Settings list: its search in the heading, groups with no glyph, and the Theme group's rows at the end.
export const Settings: Story = {
  args: {
    selectedSection: 'settings',
    list: (
      <Screen
        title="Settings"
        search={{ label: 'Search Settings' }}
        value=""
        onChangeText={action('search Settings')}
      >
        <SettingsListView
          {...readySettings}
          onSelect={action('select Settings page')}
          onThemeChange={action('choose theme')}
        />
      </Screen>
    ),
  },
};

const issuesSection = pluginSectionId('issue-tracker', 'issues');

const noLists: SectionLists = {
  sessions: { list: null },
  scheduled: { list: null },
  settings: { list: null },
};

// A Plugin's page whose ListDetail hands its list to the Frame's sidebar, as a wide window's Plugin section does.
function PluginSidebar(): ReactElement {
  const listDetail = useFrameListDetail(issuesSection);

  const { list } = sectionScaffold(
    { section: issuesSection, lists: noLists, sizeClass: 'wide' },
    listDetail,
  );

  return (
    <ScaffoldMock {...wideScaffold} band={null} list={list}>
      <FrameListDetailOffers listDetail={listDetail}>
        <SectionListDetail>
          <PluginDetailView
            {...issueFilters}
            callbacks={{ onPageCall: action('Page call') }}
          />
        </SectionListDetail>
      </FrameListDetailOffers>
    </ScaffoldMock>
  );
}

// A tracker Plugin's Issues list: a Project's collapsible section of filters with counts, drawn as the core lists are.
export const Issues: Story = {
  render: () => <PluginSidebar />,
};
