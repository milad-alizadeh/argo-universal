import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { PageTitleRow } from './page-title-row';
import { Badge } from './primitives/badge';
import { IconButton } from './primitives/icon-button';
import { Text } from './primitives/text';
import { Icon } from './symbols/icon';
import { Variation, Variations as VariationList } from './variations';

const meta = {
  title: 'Design System/PageTitleRow',
  parameters: { screenPreview: true },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const addAction = (
  <IconButton icon="add" variant="ghost" accessibilityLabel="Add Project" />
);

function SearchableTitle(): React.JSX.Element {
  const [query, setQuery] = useState('');
  return (
    <PageTitleRow
      title="Agents"
      actions={addAction}
      search={{ label: 'Search Agents', value: query, onChangeText: setQuery }}
    />
  );
}

export const Variations: Story = {
  name: 'PageTitleRow',
  render: () => (
    <VariationList className="p-6 pl-15">
      <Variation label="Title">
        <PageTitleRow title="General" />
      </Variation>
      <Variation label="Drill-in, with a back button">
        <PageTitleRow title="argo-universal" onBack={() => {}} />
      </Variation>
      <Variation label="Icon and badge">
        <PageTitleRow
          title="Claude Code"
          onBack={() => {}}
          icon={<Icon name="sparkle" />}
          badge={
            <Badge tone="success">
              <Text>Ready</Text>
            </Badge>
          }
        />
      </Variation>
      <Variation label="Actions and search">
        <SearchableTitle />
      </Variation>
    </VariationList>
  ),
};
