import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Table } from './table';
import { PlatformsTable } from './table-platforms.mocks';
import { InPlaceRowDetail, RunsTable } from './table-runs.mocks';

const meta = {
  title: 'Design System/Primitives/Lists/Table',
  component: Table,
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj;

// Columns at regular widths; a List whose rows open their Row detail at compact widths.
export const Runs: Story = {
  render: () => (
    <InPlaceRowDetail>
      <RunsTable />
    </InPlaceRowDetail>
  ),
};

// compactLayout "scroll", as a Markdown pipe table draws: the grid scrolls sideways at compact widths.
export const Scroll: Story = {
  render: () => <PlatformsTable />,
};
