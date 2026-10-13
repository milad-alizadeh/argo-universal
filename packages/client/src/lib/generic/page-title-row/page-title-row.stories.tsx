import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { IconButton } from '../primitives/buttons/icon-button/icon-button';
import { Badge } from '../primitives/display/badge/badge';
import { Text } from '../primitives/display/text/text';
import { Icon } from '../symbols/icon';
import { Variation, Variations as VariationList } from '../variations';
import { PageTitleRow } from './page-title-row';

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

const variations = [
  { label: 'Title', row: <PageTitleRow title="General" /> },
  {
    label: 'Drill-in, with a back button',
    row: <PageTitleRow title="argo-universal" onBack={() => {}} />,
  },
  {
    label: 'Icon and badge',
    row: (
      <PageTitleRow
        title="Claude Code"
        onBack={() => {}}
        icon={<Icon name="sparkle" role="title" />}
        badge={
          <Badge tone="success">
            <Text>Ready</Text>
          </Badge>
        }
      />
    ),
  },
  { label: 'Actions and search', row: <SearchableTitle /> },
];

export const Variations: Story = {
  name: 'PageTitleRow',
  render: () => (
    <VariationList className="p-6 pl-15">
      {variations.map(({ label, row }) => (
        <Variation key={label} label={label}>
          {row}
        </Variation>
      ))}
    </VariationList>
  ),
};
