import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor } from 'storybook/test';
import { ScreenHeaderProvider } from '#lib/product/navigation/screen-header';
import { ScreenHeaderMock } from '../../../../../mocks/screen-header-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  controlledPhoneLayout,
  drawerSections,
  openNavigationLabel,
  pickDrawerSection,
  tabletWidth,
  withPhoneLayout,
} from './phone-layout-test.mocks';
import { PhoneShellFrame } from './phone-shell-frame.mocks';

const meta = {
  ...controlledPhoneLayout,
  title: 'Tests/PhoneShell',
} satisfies Meta<typeof controlledPhoneLayout.component>;

export default meta;
type Story = StoryObj<typeof meta>;

function menuOpensAndSelectionClosesDrawer(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await withPhoneLayout({ canvas, attention: 1 }, async (layout) => {
        for (const section of drawerSections) {
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
          await pickDrawerSection({ canvas, userEvent, layout, section });
          await expect(
            canvas.queryByRole('heading', { name: 'Argo' }),
          ).toBeNull();
        }
      });
    },
  };
}
export const MenuOpensAndSelectionClosesDrawerPhone =
  menuOpensAndSelectionClosesDrawer(layoutWidths.phone);
export const MenuOpensAndSelectionClosesDrawerTablet =
  menuOpensAndSelectionClosesDrawer(tabletWidth);

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
