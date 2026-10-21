import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type SettingsLayoutProps = KitProps<'SettingsLayout'> & {
  // Kit-only: opens a page by its route, as the App's router does; without it a row follows its link.
  onSelect?: (href: string) => void;
  /*
   * Kit-only: a last ListSection whose rows open no page, such as Settings' Theme with its inline Picker. A wide web
   * sidebar pins it to its bottom; elsewhere it ends the list.
   */
  pinned?: ReactNode;
  testID?: string;
};

// The groups at one Size class.
export type SettingsLayoutSections = Extract<
  SettingsLayoutProps['sections'],
  readonly unknown[]
>;

export type SettingsLayoutSection = SettingsLayoutSections[number];

export type SettingsLayoutItem = SettingsLayoutSection['items'][number];
