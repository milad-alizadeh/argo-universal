import type { Meta } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { Text } from '#primitives/content/text';
import { Screen } from '#primitives/scaffolds/screen';
import { ListDetail } from './list-detail';
import { ListDetailSidebarPlaceOffer } from './list-detail-sidebar';
import { at, heading } from './list-detail-test.mocks';
import { ExampleListDetail, issues, syncIssue } from './list-detail.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/ListDetail/Sidebar',
  component: ListDetail,
  args: { list: null },
} satisfies Meta<typeof ListDetail>;

export default meta;

const sectionList = 'Section list';

// A section's root ListDetail hands its list to the host's sidebar and keeps the detail.
function WithSidebar(props: { nested?: boolean }): ReactElement {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return (
    <View className="flex-1 flex-row">
      <View testID="host-sidebar" className="w-frame-list">
        <HostSidebar sidebar={sidebar} />
      </View>
      <View testID="host-page" className="flex-1">
        <ListDetailSidebarPlaceOffer value={sidebar}>
          <HostScreen nested={props.nested} />
        </ListDetailSidebarPlaceOffer>
      </View>
    </View>
  );
}

function HostScreen(props: { nested?: boolean }): ReactElement {
  const example = <ExampleListDetail example={issues} initial={syncIssue.id} />;

  if (!props.nested) return example;

  return <ListDetail list={<Screen title="Settings" />} detail={example} />;
}

function HostSidebar({ sidebar }: { sidebar: Place<ReactNode> }): ReactElement {
  const list = useClaimed(sidebar);

  return <View className="flex-1">{list ?? <Text>{sectionList}</Text>}</View>;
}

export const RootListMovesToTheSidebar = at(layoutWidths.wide, {
  render: () => <WithSidebar />,
  play: async ({ canvas }) => {
    const sidebar = await canvas.findByTestId('host-sidebar');

    await waitFor(() =>
      expect(sidebar).toContainElement(
        canvas.getByRole('heading', { name: issues.title }),
      ),
    );
    await expect(canvas.getByTestId('host-page')).toContainElement(
      await heading(canvas, syncIssue.title),
    );
    await expect(canvas.queryByText(sectionList)).not.toBeInTheDocument();
  },
});

// A ListDetail in another's detail splits within it; only the outer one takes the host's sidebar.
export const NestedListDetailSplitsInItsScreen = at(layoutWidths.wide, {
  render: () => <WithSidebar nested />,
  play: async ({ canvas }) => {
    const page = await canvas.findByTestId('host-page');

    await expect(page).toContainElement(await heading(canvas, issues.title));
    await expect(page).toContainElement(await heading(canvas, syncIssue.title));
    await waitFor(() =>
      expect(canvas.getByTestId('host-sidebar')).toContainElement(
        canvas.getByRole('heading', { name: 'Settings' }),
      ),
    );
  },
});
