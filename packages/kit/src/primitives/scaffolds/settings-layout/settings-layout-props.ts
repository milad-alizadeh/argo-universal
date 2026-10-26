import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';
import type { ListDetailProps } from '../list-detail';

export type SettingsLayoutProps = KitProps<'SettingsLayout'> & {
  // Kit-only: opens a page by its route, as the App's router does; without it a row follows its link.
  onSelect?: (href: string) => void;
  /*
   * Kit-only: a last FieldGroup.Section whose rows open no page, such as Settings' Theme with its Picker. It follows the
   * pages' groups at every width.
   */
  lastSection?: ReactNode;
  // Kit-only: the pages' own Screen, which names the list and carries its search, as ListDetail's `screen` does.
  screen?: ListDetailProps['screen'];
  testID?: string;
};

// The groups at one Size class.
export type SettingsLayoutSections = Extract<
  SettingsLayoutProps['sections'],
  readonly unknown[]
>;

export type SettingsLayoutSection = SettingsLayoutSections[number];

export type SettingsLayoutItem = SettingsLayoutSection['items'][number];
