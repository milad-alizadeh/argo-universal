import type { KitProps } from '../../kit-props';

export type SettingsLayoutProps = KitProps<'SettingsLayout'> & {
  // Kit-only: opens a page by its route, as the App's router does; without it a row follows its link.
  onSelect?: (href: string) => void;
  testID?: string;
};

// The groups at one Size class.
export type SettingsLayoutSections = Extract<
  SettingsLayoutProps['sections'],
  readonly unknown[]
>;

export type SettingsLayoutSection = SettingsLayoutSections[number];

export type SettingsLayoutItem = SettingsLayoutSection['items'][number];
