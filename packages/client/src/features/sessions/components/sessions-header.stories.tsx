import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import type { SessionsView } from '../stores/sessions-view';
import { SessionsHeader } from './sessions-header';

const paperView: SessionsView = {
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const meta = {
  title: 'Sessions/SessionsHeader',
  component: SessionsHeader,
  parameters: { previewPadding: false },
  args: {
    query: '',
    onQueryChange: action('query'),
    view: paperView,
    onViewChange: action('view'),
    onNewSession: action('new Session'),
  },
} satisfies Meta<typeof SessionsHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// Paper "SessionsList": the sidebar's control bar, the title then Search, the view menu and New Session; the frame insets it 24 from the left and 14 from the right.
export const SessionsHeaderStory: Story = {
  render: function Render(args) {
    const [query, setQuery] = useState(args.query);

    return (
      <View
        testID="sessions-header"
        className="h-11 w-frame-list flex-row items-center bg-content pl-6 pr-3.5"
      >
        <SessionsHeader {...args} query={query} onQueryChange={setQuery} />
      </View>
    );
  },
};
