import { layoutWidths } from '@repo/kit/each-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, screen } from 'storybook/test';
import { ChangesInspector } from './changes-inspector';
import { changesArgs } from './changes-inspector.mocks';

export const widths = [layoutWidths.phone, layoutWidths.wide];

export const allChanges = 'All Changes (vs main)';

export const largeFile = '/repo/large.txt';

export const fewSummary = '4 files · 1 viewed';

export const noChanges = 'No changes';

export const loadErrorTitle = "Couldn't load changes";

export const comparisonDialog = 'Comparison';

// The Inspector at the height the phone sheet and the wide column give it.
export const testMeta = {
  component: ChangesInspector,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-175 w-full">
        <Story />
      </View>
    ),
  ],
  args: changesArgs,
} satisfies Meta<typeof ChangesInspector>;

// The picker's pill is named by its title and shows the chosen comparison.
export async function picker(label: string): Promise<HTMLElement> {
  const trigger = screen.getByRole('button', { name: /^Comparison/ });
  await expect(trigger).toHaveTextContent(label);

  return trigger;
}

// The phone Git sheet names its two panels; comparisons remain a desktop Inspector control.
export async function expectComparison(
  label: string,
  width: number,
): Promise<void> {
  await (width === layoutWidths.phone
    ? expect(screen.queryByRole('button', { name: /^Comparison/ })).toBeNull()
    : expect(await picker(label)).toBeVisible());
}

export const fileHeader = (path: string): HTMLElement =>
  screen.getByRole('button', { name: `Diff for ${path}` });
