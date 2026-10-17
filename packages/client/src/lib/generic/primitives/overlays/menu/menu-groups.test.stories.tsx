import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { contentActionClass } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';
import type { MenuChoiceGroup } from './menu-props';

const twoOptions = (
  label: string,
  first: string,
  second: string,
): MenuChoiceGroup => ({
  label,
  value: first.toLowerCase(),
  options: [
    { value: first.toLowerCase(), label: first },
    { value: second.toLowerCase(), label: second },
  ],
  onValueChange: fn(),
});

const viewGroups: MenuChoiceGroup[] = [
  twoOptions('Order by', 'Newest', 'Oldest'),
  twoOptions('Status', 'Active', 'Archived'),
  twoOptions('Layout', 'Regular', 'Compact'),
];

function ViewMenu(props: {
  groups: readonly MenuChoiceGroup[];
}): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="View"
      groups={props.groups}
      trigger={
        <Pressable role="button" className={contentActionClass({})}>
          <Text>View</Text>
        </Pressable>
      }
    />
  );
}

const meta = {
  title: 'Tests/Menu/Groups',
  component: ViewMenu,
  args: { groups: viewGroups },
} satisfies Meta<typeof ViewMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

// The menu's rows and section lines in document order, by role.
async function openedRoles(
  canvas: ReturnType<typeof within>,
  canvasElement: HTMLElement,
  click: (element: HTMLElement) => Promise<void>,
): Promise<(string | null)[]> {
  await settleViewport(layoutWidths.wide);
  await click(canvas.getByRole('button', { name: 'View' }));

  const menu = await within(canvasElement.ownerDocument.body).findByRole(
    'menu',
  );

  return [
    ...menu.querySelectorAll('[role="menuitemradio"], [role="separator"]'),
  ].map((element) => element.getAttribute('role'));
}

const radio = 'menuitemradio';

// A section line between each pair of groups, none before the first or after the last.
export const SeparatesGroups: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const roles = await openedRoles(canvas, canvasElement, (element) =>
      userEvent.click(element),
    );

    await expect(roles.filter((role) => role === 'separator')).toHaveLength(
      viewGroups.length - 1,
    );
    await expect(roles).toEqual([
      radio,
      radio,
      'separator',
      radio,
      radio,
      'separator',
      radio,
      radio,
    ]);
    await userEvent.keyboard('{Escape}');
  },
};

// One group draws no section line.
export const OneGroupNoSeparator: Story = {
  args: { groups: viewGroups.slice(0, 1) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const roles = await openedRoles(canvas, canvasElement, (element) =>
      userEvent.click(element),
    );

    await expect(roles).toEqual([radio, radio]);
    await userEvent.keyboard('{Escape}');
  },
};
