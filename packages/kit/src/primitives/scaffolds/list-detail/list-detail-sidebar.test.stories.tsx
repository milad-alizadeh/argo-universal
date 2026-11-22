import type { Meta } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { layoutWidths } from '#mocks/story-layout';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
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

const hostSidebar = 'host-sidebar';

// A section's root ListDetail hands its list to the host's sidebar and keeps the detail.
function WithSidebar(props: {
  nested?: boolean;
  status?: boolean;
}): ReactElement {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return (
    <View className="flex-1 flex-row">
      <View testID={hostSidebar} className="w-frame-list">
        <HostSidebar sidebar={sidebar} />
      </View>
      <View testID="host-page" className="flex-1">
        <ListDetailSidebarPlaceOffer value={sidebar}>
          <HostScreen nested={props.nested} status={props.status} />
        </ListDetailSidebarPlaceOffer>
      </View>
    </View>
  );
}

function HostScreen(props: {
  nested?: boolean;
  status?: boolean;
}): ReactElement {
  const example = <ExampleListDetail example={issues} initial={syncIssue.id} />;

  if (props.status) return <StatusListDetail />;

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
    const sidebar = await canvas.findByTestId(hostSidebar);

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
      expect(canvas.getByTestId(hostSidebar)).toContainElement(
        canvas.getByRole('heading', { name: 'Settings' }),
      ),
    );
  },
});

const statusRow = { title: 'Connection', status: 'Connected' };

// A Plugin's sidebar list whose row carries a status and no value, as Settings' Connection row does.
function StatusListDetail(): ReactElement {
  return (
    <ListDetail
      title="Status"
      list={
        <List>
          <List.Section title="Group">
            <ListItem
              title={statusRow.title}
              leading={<Icon name="folder" />}
              badge={{
                kind: 'status',
                tone: 'success',
                label: statusRow.status,
              }}
              onPress={() => {}}
            />
          </List.Section>
        </List>
      }
      detail={<Text>Detail</Text>}
    />
  );
}

// A row in the sidebar draws as a sidebar row, which keeps its status shown beside a title with no value.
export const SidebarRowKeepsItsStatus = at(layoutWidths.wide, {
  render: () => <WithSidebar status />,
  play: async ({ canvas }) => {
    const sidebar = await canvas.findByTestId(hostSidebar);
    const row = await waitFor(() => canvas.getByText(statusRow.title));

    await expect(sidebar).toContainElement(row);
    await expect(canvas.getByLabelText(statusRow.status)).toBeVisible();
  },
});
