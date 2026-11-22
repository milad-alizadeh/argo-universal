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
  lanes?: boolean;
}): ReactElement {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return (
    <View className="flex-1 flex-row">
      <View testID={hostSidebar} className="w-frame-list">
        <HostSidebar sidebar={sidebar} />
      </View>
      <View testID="host-page" className="flex-1">
        <ListDetailSidebarPlaceOffer value={sidebar}>
          <HostScreen nested={props.nested} lanes={props.lanes} />
        </ListDetailSidebarPlaceOffer>
      </View>
    </View>
  );
}

function HostScreen(props: {
  nested?: boolean;
  lanes?: boolean;
}): ReactElement {
  const example = <ExampleListDetail example={issues} initial={syncIssue.id} />;

  if (props.lanes) return <LanesListDetail />;

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

const lanes = {
  section: 'Group',
  small: 'Small glyph',
  large: 'Large glyph',
  status: 'Connected',
};

// A Plugin's sidebar list, as a tracker's: a section heading with no glyph, and rows that ask for different glyph sizes.
function LanesListDetail(): ReactElement {
  return (
    <ListDetail
      title="Lanes"
      list={
        <List>
          <List.Section title={lanes.section}>
            <ListItem
              title={lanes.small}
              leading={<Icon name="folder" testID="small-glyph" />}
              onPress={() => {}}
            />
            <ListItem
              title={lanes.large}
              leading={<Icon name="folder" size="md" testID="large-glyph" />}
              onPress={() => {}}
            />
            <ListItem
              title="With status"
              leading={<Icon name="folder" />}
              badge={{ kind: 'status', tone: 'success', label: lanes.status }}
              onPress={() => {}}
            />
          </List.Section>
        </List>
      }
      detail={<Text>Detail</Text>}
    />
  );
}

const left = (element: Element): number => element.getBoundingClientRect().left;

/*
 * Every sidebar list draws one row layout: its rows' glyphs share one lane and their titles one edge, whatever size a
 * row's glyph asks for, and a heading with no glyph starts on the glyph lane. A row's status still shows.
 */
export const SidebarRowsShareOneLane = at(layoutWidths.wide, {
  render: () => <WithSidebar lanes />,
  play: async ({ canvas }) => {
    const sidebar = await canvas.findByTestId(hostSidebar);
    const section = await heading(canvas, lanes.section);

    await expect(sidebar).toContainElement(section);

    const small = canvas.getByTestId('small-glyph');
    const large = canvas.getByTestId('large-glyph');

    await expect(left(large)).toBe(left(small));
    await expect(large.getBoundingClientRect().width).toBe(
      small.getBoundingClientRect().width,
    );
    await expect(left(canvas.getByText(lanes.large))).toBe(
      left(canvas.getByText(lanes.small)),
    );
    await expect(left(section)).toBe(left(small));
    await expect(canvas.getByLabelText(lanes.status)).toBeVisible();
  },
});
