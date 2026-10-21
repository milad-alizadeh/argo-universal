import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { MenuTrigger } from '#primitives/overlays/menu';
import type { SheetProps } from './sheet-props';

// The open state is what the example holds, so a fixture leaves it, its choices and its pages out.
export type SheetFixture = Pick<SheetProps, 'detents' | 'footer'> & {
  label: string;
};

export const fitsItsContentSheet = { label: 'Options' } satisfies SheetFixture;

export const withFooterSheet = {
  label: 'Footer',
  footer: (
    <View className="p-4">
      <Button label="Submit" />
    </View>
  ),
} satisfies SheetFixture;

export const fullHeightSheet = {
  label: 'Tall',
  detents: ['large'],
} satisfies SheetFixture;

type PagedSheetFixture = Pick<
  SheetProps,
  'label' | 'contentScrolls' | 'trigger'
>;

export const settingsSheet = {
  label: 'Settings',
  contentScrolls: true,
  trigger: <MenuTrigger label="Settings" />,
} satisfies PagedSheetFixture;

export const configureSheet = {
  label: 'Configure',
  contentScrolls: true,
  trigger: <MenuTrigger label="Configure" />,
} satisfies PagedSheetFixture;
