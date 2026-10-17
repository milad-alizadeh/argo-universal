import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { eachLayout } from '../../../../lib/generic/each-layout';
import type { SessionsView } from '../../stores/sessions-view';
import { SessionsViewMenu } from './sessions-view-menu';

const onViewChange = fn();

// Paper's defaults: Last activity, By project, Active and Regular.
const defaults: SessionsView = {
  order: 'activity',
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const changed: SessionsView = {
  order: 'created',
  group: 'none',
  status: 'all',
  layout: 'compact',
};

const meta = {
  title: 'Tests/SessionsViewMenu',
  component: SessionsViewMenu,
  args: { view: defaults, onViewChange },
  beforeEach: (): void => {
    onViewChange.mockClear();
  },
} satisfies Meta<typeof SessionsViewMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const menu = (): ReturnType<typeof within> => within(document.body);

const trigger = { name: 'Filter Sessions' };

const reset = { name: 'Reset to default' };

// Paper's options in order, each group's under its heading, with which are checked at the default and the icon each leads with.
const paperOptions = [
  { name: 'Last activity', checked: true },
  { name: 'Created', checked: false },
  { name: 'By project', checked: true },
  { name: 'One list', checked: false },
  { name: 'Active', checked: true, icon: 'active-sessions' },
  { name: 'Archived', checked: false, icon: 'archived-sessions' },
  { name: 'All', checked: false, icon: 'all-sessions' },
  { name: 'Regular', checked: true, icon: 'layout-regular' },
  { name: 'Compact', checked: false, icon: 'layout-compact' },
] as const;

const headings = ['Order by', 'Group by', 'Status', 'Layout'];

const optionRow = (name: string): HTMLElement =>
  menu().getByRole('menuitemradio', { name });

async function expectHeadings(): Promise<void> {
  for (const heading of headings)
    await expect(menu().getByText(heading)).toBeVisible();
}

// Every option in Paper's order, only the defaults checked.
async function expectOptions(): Promise<HTMLElement[]> {
  const rows = paperOptions.map(({ name }) => optionRow(name));

  await expect(menu().getAllByRole('menuitemradio')).toEqual(rows);

  for (const [index, { checked }] of paperOptions.entries())
    await expect(rows[index]).toHaveAttribute('aria-checked', String(checked));

  return rows;
}

// Reset comes after the last option.
async function expectResetLast(rows: HTMLElement[]): Promise<HTMLElement> {
  const resetRow = menu().getByRole('menuitem', reset);
  const position = rows.at(-1)?.compareDocumentPosition(resetRow) ?? 0;

  await expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  return resetRow;
}

// The four groups in Paper's order and labels, each default checked, and Reset last, disabled at the default.
export const ShowsViewOptions: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await userEvent.click(canvas.getByRole('button', trigger));
      await expectHeadings();
      const resetRow = await expectResetLast(await expectOptions());

      await expect(resetRow).toHaveAttribute('aria-disabled', 'true');
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

export const ChoosesCreated = chooses('Created', { order: 'created' });

export const ChoosesOneList = chooses('One list', { group: 'none' });

export const ChoosesArchived = chooses('Archived', { status: 'archived' });

export const ChoosesAll = chooses('All', { status: 'all' });

export const ChoosesActiveFromArchived = chooses(
  'Active',
  { status: 'active' },
  { ...defaults, status: 'archived' },
);

export const ChoosesCompact = chooses('Compact', { layout: 'compact' });

// Away from the default, Reset restores every field's default.
export const ResetsToDefault: Story = {
  args: { view: changed },
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onViewChange.mockClear();
      await userEvent.click(canvas.getByRole('button', trigger));
      const resetRow = menu().getByRole('menuitem', reset);
      await expect(resetRow).not.toHaveAttribute('aria-disabled');
      await userEvent.click(resetRow);
      await expect(onViewChange).toHaveBeenCalledTimes(1);
      await expect(onViewChange).toHaveBeenCalledWith(defaults);
    }),
};

// The trigger carries its dot only while the view is not the default.
function dotShown(view: SessionsView, shown: boolean): Story {
  return {
    args: { view },
    play: async ({ canvas }) =>
      eachLayout(async () => {
        const dots = canvas.queryAllByTestId('header-button-dot');
        await expect(dots).toHaveLength(shown ? 1 : 0);
      }),
  };
}

export const NoDotAtDefault = dotShown(defaults, false);

export const DotAwayFromDefault = dotShown(
  { ...defaults, order: 'created' },
  true,
);

// Each Status and Layout option leads with its own icon; Order by and Group by have none, as in Paper.
async function expectOptionIcon(
  option: (typeof paperOptions)[number],
): Promise<void> {
  const icons = within(optionRow(option.name))
    .queryAllByTestId(/^icon-/)
    .map((icon) => icon.dataset.testid)
    // The check, which a chosen option carries, is not the option's icon.
    .filter((testId) => testId !== 'icon-check');

  await expect(icons).toEqual('icon' in option ? [`icon-${option.icon}`] : []);
}

export const ShowsOptionIcons: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await userEvent.click(canvas.getByRole('button', trigger));

      for (const option of paperOptions) await expectOptionIcon(option);

      await userEvent.keyboard('{Escape}');
    }),
};
