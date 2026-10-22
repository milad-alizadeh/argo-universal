import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type {
  NavigationProp,
  ParamListBase,
} from 'expo-router/react-navigation';
import {
  DefaultTheme,
  Header,
  NavigationContext,
  SafeAreaProviderCompat,
  ThemeProvider,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { HeaderSearchRow, headerSearchRowLayout } from './header-search';

const title = 'Sessions';

const label = 'Search Sessions';

const partialNavigation: Partial<NavigationProp<ParamListBase>> = {
  goBack: () => {},
};

/*
 * SAFETY: Header reads two things from the app around it, a theme and a navigation object, and it
 * asks the second only for `goBack`, only when a `back` is given — which this story never gives.
 * SDK 58's container cannot stand outside ExpoRoot, so the story provides both directly, and
 * NavigationProp carries a brand that no stand-in can satisfy structurally.
 */
// oxlint-disable-next-line typescript/consistent-type-assertions -- the brand admits no other way to stand one in.
const standInNavigation = partialNavigation as NavigationProp<ParamListBase>;

// The real web JS header, as a narrow web window's stack draws it, with the app's search row options.
function WebHeaderWithSearch({
  onChangeText,
}: {
  onChangeText: (text: string) => void;
}): React.JSX.Element {
  return (
    <ThemeProvider value={DefaultTheme}>
      <NavigationContext.Provider value={standInNavigation}>
        <SafeAreaProviderCompat>
          <Header
            title={title}
            headerTitle={() => (
              <HeaderSearchRow
                title={title}
                search={{ placeholder: label, onChangeText }}
              />
            )}
            {...headerSearchRowLayout}
          />
        </SafeAreaProviderCompat>
      </NavigationContext.Provider>
    </ThemeProvider>
  );
}

const meta = {
  title: 'Tests/Design System/Patterns/HeaderSearch',
  component: WebHeaderWithSearch,
  args: { onChangeText: fn() },
} satisfies Meta<typeof WebHeaderWithSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

// Search sits beside the title in the real web header and opens into a field that filters as you type.
export const SearchFillsTheTitle: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('heading', { name: title })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: label }));
    await userEvent.type(canvas.getByRole('textbox', { name: label }), 'fix');
    await expect(args.onChangeText).toHaveBeenLastCalledWith('fix');
  },
};
