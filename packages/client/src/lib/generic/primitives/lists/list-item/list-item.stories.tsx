import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Icon } from '#primitives/content/icon';
import { Label } from '#primitives/content/label';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { Variation, Variations } from '../../../variations';
import { ListItem } from './list-item';
import type { ListItemProps } from './list-item-props';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem',
  args: { title: 'Build the Session layout' },
  component: ListItem,
} satisfies Meta<typeof ListItem>;

export default meta;

const rows: ListItemProps[] = [
  {
    title: 'Build the Session layout',
    leading: <Icon role="body" name="agent" />,
  },
  {
    title: 'Answer review comments',
    subtitle: 'Waiting for input',
    selected: true,
    onPress: fn(),
  },
  {
    title: 'Deploy web to production',
    subtitle: 'main · Fix cache headers',
    leading: <Icon role="body" name="code" />,
    meta: (
      <>
        <Label icon="check" text="2/5 jobs" />
        <Pill text="Production" />
      </>
    ),
    progress: { value: 0.4, tone: 'success', active: true },
  },
  {
    title: 'Archived Session',
    disabled: true,
    badge: 3,
    leading: <Icon role="body" name="archive" />,
    onPress: fn(),
  },
];

function Anatomy(): React.JSX.Element {
  return (
    <List
      appearance="cards"
      maxHeight={900}
      items={rows}
      keyExtractor={(row) => row.title}
      renderItem={(row) => <ListItem {...row} />}
    />
  );
}

export const Overview: StoryObj<typeof meta> = {
  name: 'ListItem',
  render: () => (
    <Variations>
      <Variation label="One, two and three lines; selected, progress, badge and disabled">
        <Anatomy />
      </Variation>
    </Variations>
  ),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Deploy web to production'),
    ).toBeVisible();
    await expect(canvas.getByText('2/5 jobs')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Archived Session' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};
