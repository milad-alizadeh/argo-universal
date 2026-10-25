import { eachLayout } from '@repo/kit/each-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import type { SessionsView } from '../../stores/sessions-view';
import { SessionsViewMenu } from './sessions-view-menu';

const onViewChange = fn();

// Paper's defaults: Regular, By project and Active.
const defaults: SessionsView = {
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const meta = {
  title: 'Tests/Sessions/SessionsViewMenu',
  component: SessionsViewMenu,
  args: { view: defaults, onViewChange },
  beforeEach: (): void => {
    onViewChange.mockClear();
  },
} satisfies Meta<typeof SessionsViewMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const menu = (): ReturnType<typeof within> => within(document.body);

const trigger = { name: /^Filter Sessions/ };

// Paper's options in order, each group's under its heading, with its icon and which are checked at the default.
const paperOptions = [
  { name: 'Regular', icon: 'regular-layout', checked: true },
  { name: 'Compact', icon: 'compact-layout', checked: false },
  { name: 'By project', icon: 'folder', checked: true },
  { name: 'One list', icon: 'one-list', checked: false },
  { name: 'Active', icon: 'triage', checked: true },
  { name: 'Archived', icon: 'archived', checked: false },
  { name: 'All', icon: 'all-sessions', checked: false },
] as const;

const headings = ['Layout', 'Group by', 'Status'];

const optionRow = (name: string): HTMLElement =>
  menu().getByRole('menuitemradio', { name });

async function expectHeadings(): Promise<void> {
  for (const heading of headings)
    await expect(menu().getByText(heading)).toBeVisible();
}

// Every option in Paper's order, only the defaults checked.
async function expectOptions(): Promise<void> {
  const rows = paperOptions.map(({ name }) => optionRow(name));

  await expect(menu().getAllByRole('menuitemradio')).toEqual(rows);

  for (const [index, { checked }] of paperOptions.entries())
    await expect(rows[index]).toHaveAttribute('aria-checked', String(checked));
}

// The three groups in Paper's order and labels, each default checked, and no action after them.
export const ShowsViewOptions: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await userEvent.click(canvas.getByRole('button', trigger));
      await expectHeadings();
      await expectOptions();
      await expect(menu().queryAllByRole('menuitem')).toEqual([]);
      await userEvent.keyboard('{Escape}');
    }),
};

// Choosing an option, from the default or another view, changes its own field and leaves the others as they are.
function chooses(
  option: string,
  change: Partial<SessionsView>,
  from: SessionsView = defaults,
): Story {
  return {
    args: { view: from },
    play: async ({ canvas, userEvent }) =>
      eachLayout(async () => {
        onViewChange.mockClear();
        await userEvent.click(canvas.getByRole('button', trigger));
        await userEvent.click(
          menu().getByRole('menuitemradio', { name: option }),
        );
        await expect(onViewChange).toHaveBeenCalledTimes(1);
        await expect(onViewChange).toHaveBeenCalledWith({
          ...from,
          ...change,
        });
      }),
  };
}

export const ChoosesOneList = chooses('One list', { group: 'none' });

export const ChoosesArchived = chooses('Archived', { status: 'archived' });

export const ChoosesAll = chooses('All', { status: 'all' });

export const ChoosesActiveFromArchived = chooses(
  'Active',
  { status: 'active' },
  { ...defaults, status: 'archived' },
);

export const ChoosesCompact = chooses('Compact', { layout: 'compact' });

// The trigger carries its dot, and says "Changed" after its name, only while the view is not the default.
function dotShown(view: SessionsView, shown: boolean): Story {
  return {
    args: { view },
    play: async ({ canvas }) =>
      eachLayout(async () => {
        const dots = canvas.queryAllByTestId('header-button-dot');
        await expect(dots).toHaveLength(shown ? 1 : 0);
        await expect(
          canvas.getByRole('button', {
            name: shown ? 'Filter Sessions, Changed' : /^Filter Sessions$/,
          }),
        ).toBeInTheDocument();
      }),
  };
}

export const NoDotAtDefault = dotShown(defaults, false);

export const DotAwayFromDefault = dotShown(
  { ...defaults, layout: 'compact' },
  true,
);

// The chosen option leads with the check, and every option carries its own icon after it.
async function expectOptionIcons(
  option: (typeof paperOptions)[number],
): Promise<void> {
  const icons = within(optionRow(option.name))
    .queryAllByTestId(/^icon-/)
    .map((icon) => icon.dataset.testid);

  const check = option.checked ? ['icon-check'] : [];

  await expect(icons).toEqual([...check, `icon-${option.icon}`]);
}

export const ShowsOptionIcons: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await userEvent.click(canvas.getByRole('button', trigger));

      for (const option of paperOptions) await expectOptionIcons(option);

      await userEvent.keyboard('{Escape}');
    }),
};
