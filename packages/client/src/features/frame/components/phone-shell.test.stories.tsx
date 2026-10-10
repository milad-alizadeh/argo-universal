import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Text } from '#lib/generic/primitives/text';
import { NavigationProvider } from '#lib/product/navigation/context';
import {
  ScreenHeader,
  ScreenHeaderProvider,
} from '#lib/product/navigation/screen-header';
import { ScreenHeaderMock } from '../../../../mocks/screen-header-mock';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { sectionDestination } from '../../../lib/product/navigation/sections';
import type { Section } from '../../../lib/product/navigation/sections';
import { PhoneLayoutView } from './phone-layout-view';
import { PhoneMenuButton } from './phone-menu-button';
import { PhoneShell } from './phone-shell';
import { PhoneShellFrame } from './phone-shell-frame.mocks';
import { shellSections } from './shell-sections';

const openNavigationLabel = 'Open navigation';

const meta = {
  title: 'Tests/PhoneShell',
  component: PhoneShell,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    onDrawerOpenChange: fn(),
    onSectionChange: fn(),
    children: null,
  },
  render: (): React.JSX.Element => (
    <View testID="controlled-phone-layout" className="w-full" />
  ),
} satisfies Meta<typeof PhoneShell>;

function mountPhoneLayout(
  element: HTMLElement,
  attention: number,
): {
  root: ReturnType<typeof createRoot>;
  render: (section: Section) => Promise<void>;
  onNavigate: ReturnType<typeof fn>;
} {
  const root = createRoot(element);
  const onNavigate = fn();
  const render = async (section: Section): Promise<void> => {
    root.render(
      <SafeAreaProvider>
        <KeyboardProvider>
          <NavigationProvider navigate={onNavigate}>
            <ScreenHeaderProvider header={ScreenHeaderMock}>
              <View style={{ height: 600 }} className="w-full">
                <PhoneLayoutView
                  destination={sectionDestination(section)}
                  attentionCount={attention}
                >
                  <View testID="phone-shell-content" className="flex-1">
                    <ScreenHeader
                      title={shellSections[section].title}
                      left={<PhoneMenuButton />}
                    />
                    <Text>{shellSections[section].title} content</Text>
                  </View>
                </PhoneLayoutView>
              </View>
              <PortalHost />
            </ScreenHeaderProvider>
          </NavigationProvider>
        </KeyboardProvider>
      </SafeAreaProvider>,
    );
    await within(element).findByRole('heading', {
      name: shellSections[section].title,
    });
  };
  return { root, render, onNavigate };
}

export default meta;
type Story = StoryObj<typeof meta>;

export const CardHeightAnimatesWithDrawer: Story = {
  render: () => <View testID="controlled-shell" />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    const root = createRoot(canvas.getByTestId('controlled-shell'));
    const onDrawerOpenChange = fn();
    const render = (drawerOpen: boolean): void =>
      root.render(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 600 },
            insets: { top: 0, bottom: 0, left: 0, right: 0 },
          }}
        >
          <View style={{ height: 600 }}>
            <PhoneShell
              selectedSection="sessions"
              attentionCount={1}
              drawerOpen={drawerOpen}
              onDrawerOpenChange={onDrawerOpenChange}
              onSectionChange={fn()}
            >
              <PhoneMenuButton />
            </PhoneShell>
          </View>
        </SafeAreaProvider>,
      );
    try {
      render(false);
      const card = await canvas.findByTestId('phone-shell-card');
      const closedHeight = card.getBoundingClientRect().height;
      await userEvent.click(
        canvas.getByRole('button', { name: openNavigationLabel }),
      );
      await expect(onDrawerOpenChange).toHaveBeenCalledWith(true);
      render(true);
      const openingHeights: number[] = [];
      for (let frame = 0; frame < 12; frame++) {
        await new Promise(requestAnimationFrame);
        openingHeights.push(card.getBoundingClientRect().height);
      }
      await waitFor(() =>
        expect(card.getBoundingClientRect().height).toBeLessThan(closedHeight),
      );
      const openHeight = card.getBoundingClientRect().height;
      await expect(
        openingHeights.some(
          (height) => height > openHeight + 1 && height < closedHeight - 1,
        ),
      ).toBe(true);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close navigation' }),
      );
      await expect(onDrawerOpenChange).toHaveBeenLastCalledWith(false);
      render(false);
      const closingHeights: number[] = [];
      for (let frame = 0; frame < 12; frame++) {
        await new Promise(requestAnimationFrame);
        closingHeights.push(card.getBoundingClientRect().height);
      }
      await expect(
        closingHeights.some(
          (height) => height > openHeight + 1 && height < closedHeight - 1,
        ),
      ).toBe(true);
      await waitFor(() =>
        expect(card.getBoundingClientRect().height).toBe(closedHeight),
      );
    } finally {
      root.unmount();
    }
  },
};

// A width between the phone and wide layouts.
const tabletWidth = 1024;

function menuOpensAndSelectionClosesDrawer(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const controlled = mountPhoneLayout(
        canvas.getByTestId('controlled-phone-layout'),
        1,
      );
      try {
        await controlled.render('sessions');
        for (const section of [
          'sessions',
          'issues',
          'atlas',
          'settings',
        ] satisfies Section[]) {
          await expect(
            canvas.queryByRole('button', { name: 'Sessions' }),
          ).toBeNull();
          const content = canvas.getByTestId('phone-shell-content');
          const closedPosition = canvas
            .getByTestId('phone-shell')
            .getBoundingClientRect().left;
          // The previous selection's close animation must settle before the menu button is clicked.
          await waitFor(() =>
            expect(content.getBoundingClientRect().left).toBeCloseTo(
              closedPosition,
              0,
            ),
          );
          await userEvent.click(
            canvas.getByRole('button', { name: openNavigationLabel }),
          );
          await expect(
            canvas.getByRole('heading', { name: 'Argo' }),
          ).toBeVisible();
          await waitFor(() =>
            expect(content.getBoundingClientRect().left).toBeGreaterThan(
              closedPosition + 250,
            ),
          );
          await expect(
            canvas.getByLabelText('1 Session needs attention'),
          ).toBeVisible();
          await userEvent.click(
            canvas.getByRole('button', { name: shellSections[section].title }),
          );
          if (section !== 'sessions')
            await expect(controlled.onNavigate).toHaveBeenLastCalledWith(
              sectionDestination(section),
            );
          await controlled.render(section);
          await expect(
            await canvas.findByRole('heading', {
              name: shellSections[section].title,
            }),
          ).toBeVisible();
          await expect(
            canvas.queryByRole('heading', { name: 'Argo' }),
          ).toBeNull();
        }
      } finally {
        controlled.root.unmount();
      }
    },
  };
}
export const MenuOpensAndSelectionClosesDrawerPhone =
  menuOpensAndSelectionClosesDrawer(layoutWidths.phone);
export const MenuOpensAndSelectionClosesDrawerTablet =
  menuOpensAndSelectionClosesDrawer(tabletWidth);

function attentionAndSectionStates(count: number, width: number): Story {
  return {
    args: { attentionCount: count },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const controlled = mountPhoneLayout(
        canvas.getByTestId('controlled-phone-layout'),
        count,
      );
      try {
        await controlled.render('sessions');
        for (const section of [
          'sessions',
          'issues',
          'atlas',
          'settings',
        ] satisfies Section[]) {
          await userEvent.click(
            canvas.getByRole('button', { name: openNavigationLabel }),
          );
          const badge = canvas.queryByLabelText(
            `${count} ${count === 1 ? 'Session needs' : 'Sessions need'} attention`,
          );
          if (count === 0) await expect(badge).toBeNull();
          else await expect(badge).toHaveTextContent(count > 99 ? '99+' : '1');
          await userEvent.click(
            canvas.getByRole('button', { name: shellSections[section].title }),
          );
          if (section !== 'sessions')
            await expect(controlled.onNavigate).toHaveBeenLastCalledWith(
              sectionDestination(section),
            );
          await controlled.render(section);
          await expect(
            await canvas.findByRole('heading', {
              name: shellSections[section].title,
            }),
          ).toBeVisible();
          await userEvent.click(
            canvas.getByRole('button', { name: openNavigationLabel }),
          );
          await expect(
            canvas.getByRole('button', { name: shellSections[section].title }),
          ).toHaveAttribute('aria-selected', 'true');
          await userEvent.click(
            canvas.getByRole('button', { name: 'Close navigation' }),
          );
          await expect(
            canvas.queryByRole('heading', { name: 'Argo' }),
          ).toBeNull();
        }
      } finally {
        controlled.root.unmount();
      }
    },
  };
}

export const NoAttentionPhone = attentionAndSectionStates(
  0,
  layoutWidths.phone,
);
export const NoAttentionTablet = attentionAndSectionStates(0, tabletWidth);
export const OneAttentionPhone = attentionAndSectionStates(
  1,
  layoutWidths.phone,
);
export const OneAttentionTablet = attentionAndSectionStates(1, tabletWidth);
export const OverflowAttentionPhone = attentionAndSectionStates(
  100,
  layoutWidths.phone,
);
export const OverflowAttentionTablet = attentionAndSectionStates(
  100,
  tabletWidth,
);

export const HeaderActionsReportCallbacks: Story = {
  render: () => <View testID="header-actions-root" />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    const root = createRoot(canvas.getByTestId('header-actions-root'));
    const onSearch = fn();
    const onFilter = fn();
    try {
      root.render(
        <SafeAreaProvider>
          <ScreenHeaderProvider header={ScreenHeaderMock}>
            <View style={{ height: 600 }}>
              <PhoneShellFrame onSearch={onSearch} onFilter={onFilter} />
            </View>
          </ScreenHeaderProvider>
        </SafeAreaProvider>,
      );
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Search Sessions' }),
      );
      await expect(onSearch).toHaveBeenCalledOnce();
      await expect(onFilter).not.toHaveBeenCalled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await expect(onFilter).toHaveBeenCalledOnce();
      await expect(onSearch).toHaveBeenCalledOnce();
    } finally {
      root.unmount();
    }
  },
};
