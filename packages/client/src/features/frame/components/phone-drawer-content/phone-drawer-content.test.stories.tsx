import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expect, fn, waitFor, type within } from 'storybook/test';
import { userEvent as browserKeyboard } from 'vitest/browser';
import type { Section } from '../../../../lib/product/navigation/sections';
import { pluginNavigationItems } from '../navigation-items.mocks';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from './phone-drawer-content';

const scrimLabel = 'Close navigation';

const meta = {
  title: 'Tests/Frame/PhoneDrawerContent',
  component: PhoneDrawerContent,
  args: {
    items: pluginNavigationItems,
    selectedSection: 'sessions',
    attentionCount: 0,
    open: true,
    scrimLabel,
    onSectionChange: fn(),
  },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

interface AttentionCase {
  count: number;
  label: string;
  text: string | null;
}

// Only the Sessions row carries the badge, capped at 99+.
function attentionBadge({ count, label, text }: AttentionCase): Story {
  return {
    args: { attentionCount: count },
    play: async ({ canvas }) => {
      const badge = canvas.queryByLabelText(label);

      if (text === null) return expect(badge).toBeNull();

      await expect(badge).toHaveTextContent(text);
    },
  };
}

export const NoAttention = attentionBadge({
  count: 0,
  label: '0 Sessions need attention',
  text: null,
});

export const OneAttention = attentionBadge({
  count: 1,
  label: '1 Session needs attention',
  text: '1',
});

export const OverflowAttention = attentionBadge({
  count: 100,
  label: '100 Sessions need attention',
  text: '99+',
});

// A Plugin nav item's count shows on its own row, capped at 99+.
export const PluginBadgeShowsOnItsRow: Story = {
  args: {
    pluginBadges: [
      { pluginId: 'issue-tracker', id: 'issues', count: 12 },
      { pluginId: 'example', id: 'example', count: 100 },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('12')).toHaveTextContent('12');
    await expect(canvas.getByLabelText('99+')).toHaveTextContent('99+');
  },
};

export const ZeroPluginBadgeShowsNothing: Story = {
  args: {
    pluginBadges: [{ pluginId: 'issue-tracker', id: 'issues', count: 0 }],
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText('0')).toBeNull();
  },
};

function selectedRow(section: Section): Story {
  return {
    args: { selectedSection: section },
    play: async ({ canvas }) => {
      for (const other of pluginNavigationItems)
        await expect(
          canvas.getByRole('button', { name: other.title }),
        ).toHaveAttribute('aria-pressed', String(other.id === section));
    },
  };
}

export const SessionsSelected = selectedRow('sessions');

export const SettingsSelected = selectedRow('settings');

export const PluginSelected = selectedRow('plugins/example/example');

// Core sections first, then each Plugin nav item in manifest order.
export const ListsCoreSectionsBeforePluginItems: Story = {
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole('button', {
      name: /^(Sessions|Settings|Issues|Example)$/,
    });

    await expect(rows).toHaveLength(pluginNavigationItems.length);

    for (const [index, item] of pluginNavigationItems.entries())
      await expect(rows[index]).toHaveAccessibleName(item.title);
  },
};

export const PickingARowReportsItsSection: Story = {
  play: async ({ args, canvas, userEvent }) => {
    for (const { id, title } of pluginNavigationItems) {
      await userEvent.click(canvas.getByRole('button', { name: title }));
      await expect(args.onSectionChange).toHaveBeenLastCalledWith(id);
    }
  },
};

export const ClosedIsHiddenFromAssistiveTechnology: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('heading', { name: 'Argo' })).toBeNull();
  },
};

interface DrawerAndPageProps extends Omit<PhoneDrawerContentProps, 'open'> {
  startsOpen: boolean;
}

const openerName = 'Open navigation';

// A page of the window: its header's opener, its own control, and the stand-ins for the navigator's drawer and scrim, which sit beside the page as the navigator's do. A page is replaced when a row is picked, and draws its own opener.
function PageOf({
  section,
  onOpen,
  scrim,
}: {
  section: string;
  onOpen: () => void;
  scrim: React.ReactNode;
}): React.JSX.Element {
  return (
    <View key={section}>
      <Pressable role="button" aria-label={openerName} onPress={onOpen}>
        <Text>{openerName}</Text>
      </Pressable>
      <Pressable role="button">
        <Text>Page control</Text>
      </Pressable>
      {scrim}
    </View>
  );
}

function DrawerAndPage({
  startsOpen,
  onSectionChange,
  ...drawer
}: DrawerAndPageProps): React.JSX.Element {
  const [open, setOpen] = useState(startsOpen);
  const [section, setSection] = useState('first');

  return (
    <View>
      <PhoneDrawerContent
        {...drawer}
        open={open}
        onSectionChange={(next) => {
          onSectionChange(next);
          setSection(next);
          setOpen(false);
        }}
      />
      <PageOf
        section={section}
        onOpen={() => setOpen(true)}
        scrim={
          <View aria-hidden={!open}>
            <Pressable
              role="button"
              aria-label={scrimLabel}
              onPress={() => setOpen(false)}
            >
              <Text>Backdrop</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const sectionTitles = pluginNavigationItems.map((item) => item.title);

const [firstSection, lastSection] = [sectionTitles[0], sectionTitles.at(-1)];

if (
  firstSection === undefined ||
  lastSection === undefined ||
  firstSection === lastSection
)
  throw new Error('Recorded catalog needs at least two sections');

const drawerAndPage = (startsOpen: boolean): Story => ({
  args: { open: startsOpen },
  render: ({ open: _open, ...args }) => (
    <DrawerAndPage {...args} startsOpen={startsOpen} />
  ),
});

type Canvas = Pick<ReturnType<typeof within>, 'getByRole'>;

const rowNamed = (canvas: Canvas, title: string): HTMLElement =>
  canvas.getByRole('button', { name: title });

// A closed drawer's rows are off screen and hidden; Tab goes straight to the page.
export const ClosedDrawerTakesNoTabStop: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: openerName }).focus();
    await browserKeyboard.tab();

    await expect(
      canvas.getByRole('button', { name: 'Page control' }),
    ).toHaveFocus();
  },
};

// Opening the drawer moves focus to its first row.
export const OpeningMovesFocusIntoTheDrawer: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: openerName }));
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());
  },
};

// Tab past the last row wraps to the first, never reaching the page.
export const TabWrapsWithinTheOpenDrawer: Story = {
  ...drawerAndPage(true),
  play: async ({ canvas }) => {
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());

    for (const title of sectionTitles.slice(1)) {
      await browserKeyboard.tab();
      await expect(rowNamed(canvas, title)).toHaveFocus();
    }

    await browserKeyboard.tab();
    await expect(rowNamed(canvas, firstSection)).toHaveFocus();
  },
};

// Shift+Tab before the first row wraps to the last.
export const ShiftTabWrapsWithinTheOpenDrawer: Story = {
  ...drawerAndPage(true),
  play: async ({ canvas }) => {
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());

    await browserKeyboard.tab({ shift: true });
    await expect(rowNamed(canvas, lastSection)).toHaveFocus();
  },
};

// Closing returns focus to the control that opened the drawer.
export const ClosingReturnsFocusToTheOpener: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole('button', { name: openerName });

    await userEvent.click(opener);
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());

    await userEvent.click(canvas.getByText('Backdrop'));
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

const isControl = (element: Element | null): element is Element =>
  element !== null && element !== document.body;

const labelOf = (element: Element | null): string | null =>
  isControl(element) ? (element.getAttribute('aria-label') ?? '') : null;

// Tab from the opener to the end of the page, naming each stop; stops at the body, where focus leaves the controls.
async function tabStopsFromOpener(canvas: Canvas): Promise<string[]> {
  canvas.getByRole('button', { name: openerName }).focus();
  const names: string[] = [];

  for (let press = 0; press < 20; press += 1) {
    await browserKeyboard.tab();
    const name = labelOf(document.activeElement);

    if (name === null) break;
    names.push(name);
  }

  return names;
}

// Closed, nothing the drawer draws is reachable: not its rows, and not the backdrop that closes it.
export const ClosedDrawerLeavesNoBackdropTabStop: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas }) => {
    const names = await tabStopsFromOpener(canvas);

    await expect(names).not.toContain(scrimLabel);
    await expect(names).toHaveLength(1);
  },
};

// The backdrop closes the drawer, and the drawer opened again takes focus as it did the first time.
export const ReopeningAfterTheBackdropClosesTakesFocusAgain: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: openerName }));
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());
    await userEvent.click(canvas.getByText('Backdrop'));
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: firstSection })).toBeNull(),
    );
    await userEvent.click(canvas.getByRole('button', { name: openerName }));

    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());
  },
};

// Picking a row replaces the page that held the opener; focus lands on the new page's opener, not the body.
export const PickingARowLandsFocusOnTheNewPage: Story = {
  ...drawerAndPage(false),
  play: async ({ canvas }) => {
    const opener = canvas.getByRole('button', { name: openerName });

    opener.focus();
    await browserKeyboard.keyboard('{Enter}');
    await waitFor(() => expect(rowNamed(canvas, firstSection)).toHaveFocus());
    await browserKeyboard.tab();
    await browserKeyboard.keyboard('{Enter}');

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: openerName })).toHaveFocus(),
    );
    await expect(canvas.getByRole('button', { name: openerName })).not.toBe(
      opener,
    );
  },
};
