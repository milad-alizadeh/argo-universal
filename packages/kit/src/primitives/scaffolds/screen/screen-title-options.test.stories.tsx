import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useState, type ReactElement } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { settleOverlays } from '#mocks/settle-overlays';
import { Text } from '#primitives/content/text';
import { Screen } from './index';
import { TitleAndOptionsExample } from './screen-title-options.mocks';
import { atWidth, screenWidths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/TitleOptions',
  component: Screen,
  args: { title: 'Group one' },
  render: (): ReactElement => <TitleAndOptionsExample />,
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const optionsButton = { name: 'Options, 1' };

const body = ({ canvasElement }: PlayContext): ReturnType<typeof within> =>
  within(canvasElement.ownerDocument.body);

// The title stays the page's heading and holds a menu button named by it, which opens the menu with the shown one checked.
const titleMenu: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;
    const heading = canvas.getByRole('heading', { level: 1 });
    const button = within(heading).getByRole('button', { name: 'Group one' });

    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(button);
    await expect(
      await body(context).findByRole('menuitemradio', { name: 'Group one' }),
    ).toHaveAttribute('aria-checked', 'true');

    const other = await body(context).findByRole('menuitemradio', {
      name: 'Group two',
    });

    await settleOverlays(other);
    await userEvent.click(other);

    await expect(
      canvas.getByRole('button', { name: 'Group two' }),
    ).toBeVisible();
  },
};

export const TitleMenuPhone = atWidth(screenWidths.Phone, titleMenu);

export const TitleMenuWide = atWidth(screenWidths.Wide, titleMenu);

// The title's menu is reached and opened from the keyboard, and Escape gives focus back to it.
export const TitleMenuKeyboard = atWidth(screenWidths.Wide, {
  play: async (context) => {
    const { canvas, userEvent } = context;
    const button = canvas.getByRole('button', { name: 'Group one' });

    button.focus();
    await userEvent.keyboard('{Enter}');

    const row = await body(context).findByRole('menuitem', {
      name: 'Change place…',
    });

    await settleOverlays(row);
    await expect(row).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(button).toHaveFocus());
  },
});

/*
 * One Options button, its badge counting the filter in use, opens the view switch and the filter; a choice inside
 * them applies at once and leaves them open.
 */
const options: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await userEvent.click(canvas.getByRole('button', optionsButton));

    const dialog = await body(context).findByRole('dialog', {
      name: 'Options',
    });

    await settleOverlays();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Board' }),
    );
    await expect(canvas.getByText('Showing board, closed')).toBeVisible();
    await expect(
      body(context).getByRole('dialog', { name: 'Options' }),
    ).toBeVisible();
  },
};

export const OptionsPhone = atWidth(screenWidths.Phone, options);

export const OptionsWide = atWidth(screenWidths.Wide, options);

// A wide window opens the options as a popover below its button, kept inside the window; Escape closes it.
export const OptionsPopoverWide = atWidth(screenWidths.Wide, {
  play: async (context) => {
    const { canvas, userEvent } = context;
    const button = canvas.getByRole('button', optionsButton);

    await userEvent.click(button);

    const dialog = await body(context).findByRole('dialog', {
      name: 'Options',
    });

    await settleOverlays();

    const below = dialog.getBoundingClientRect();
    const trigger = button.getBoundingClientRect();

    await expect(below.top).toBeGreaterThanOrEqual(trigger.bottom);
    await expect(below.right).toBeLessThanOrEqual(window.innerWidth);

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        body(context).queryByRole('dialog', { name: 'Options' }),
      ).toBeNull(),
    );
  },
});

// The card a FieldGroup row sits on: the nearest box around it that draws a border.
function cardOf(node: HTMLElement | null): HTMLElement {
  if (!node) throw new Error('The row sits on no card');

  return getComputedStyle(node).borderTopWidth === '0px'
    ? cardOf(node.parentElement)
    : node;
}

const leftOf = (element: Element): number =>
  Math.round(element.getBoundingClientRect().left);

/*
 * The sheet insets its content once: the view switch, the Filter heading and the first FieldGroup card start on one
 * edge, as an iOS sheet's controls and grouped cards do.
 */
const oneEdge: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await userEvent.click(canvas.getByRole('button', optionsButton));

    const dialog = await body(context).findByRole('dialog', {
      name: 'Options',
    });

    await settleOverlays();

    const edge = leftOf(within(dialog).getByRole('group', { name: 'Show as' }));
    const card = cardOf(within(dialog).getByText('Status'));

    await expect(leftOf(card)).toBe(edge);
    await expect(leftOf(within(dialog).getByText('Filter'))).toBe(edge);
  },
};

export const OptionsOneEdgePhone = atWidth(screenWidths.Phone, oneEdge);

export const OptionsOneEdgeWide = atWidth(screenWidths.Wide, oneEdge);

// A wide window's Options pill shows its count beside its label, as well as saying it.
export const OptionsPillCountWide = atWidth(screenWidths.Wide, {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', optionsButton)).toHaveTextContent(
      'Options · 1',
    );
  },
});

// The title's menu opens below the title, lined up with its start, not over what sits to its left.
export const TitleMenuBelowWide = atWidth(screenWidths.Wide, {
  play: async (context) => {
    const { canvas, userEvent } = context;
    const button = canvas.getByRole('button', { name: 'Group one' });

    await userEvent.click(button);

    const menu = await body(context).findByRole('menu');

    await settleOverlays(menu);

    const below = menu.getBoundingClientRect();
    const title = button.getBoundingClientRect();

    await expect(Math.round(below.left)).toBe(Math.round(title.left));
    await expect(below.top).toBeGreaterThanOrEqual(title.bottom);
  },
});

const toggleOptions = 'story:toggle-options';

// A Screen whose options come and go when the story says, as a Plugin's redraw without them does.
function ComingAndGoing(): ReactElement {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const toggle = (): void => setShown((now) => !now);

    window.addEventListener(toggleOptions, toggle);

    return (): void => window.removeEventListener(toggleOptions, toggle);
  }, []);

  return (
    <Screen
      title="Group one"
      options={shown ? <Text>Some options</Text> : undefined}
    >
      <Text>{shown ? 'Options shown' : 'Options gone'}</Text>
    </Screen>
  );
}

// Options that go away while open close with them, so they come back closed.
const optionsComeBackClosed: Story = {
  render: (): ReactElement => <ComingAndGoing />,
  play: async (context) => {
    const { canvas, userEvent } = context;

    await userEvent.click(canvas.getByRole('button', { name: 'Options' }));
    const shown = await body(context).findByText('Some options');

    await settleOverlays();
    await expect(shown).toBeVisible();

    window.dispatchEvent(new Event(toggleOptions));
    await expect(await canvas.findByText('Options gone')).toBeVisible();

    window.dispatchEvent(new Event(toggleOptions));
    await expect(await canvas.findByText('Options shown')).toBeVisible();
    await waitFor(() =>
      expect(body(context).queryByText('Some options')).toBeNull(),
    );
    await expect(canvas.getByRole('button', { name: 'Options' })).toBeVisible();
  },
};

export const OptionsComeBackClosedPhone = atWidth(
  screenWidths.Phone,
  optionsComeBackClosed,
);

export const OptionsComeBackClosedWide = atWidth(
  screenWidths.Wide,
  optionsComeBackClosed,
);
