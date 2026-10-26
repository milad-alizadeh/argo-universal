import type { ReactElement } from 'react';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import type { SettingsLayoutProps } from './settings-layout-props';
import { SettingsPages } from './settings-pages';

/*
 * Foundations / SettingsLayout: Settings' pages beside the page shown, a thin name over ListDetail. On a wide window the
 * list sits beside the page; under wide it pushes each page. The App's Frame holds the list itself, as SettingsPages.
 */
export function SettingsLayout({
  children,
  testID,
  ...pages
}: SettingsLayoutProps): ReactElement {
  return (
    <ListDetail
      testID={testID}
      list={<SettingsPages {...pages} />}
      detail={children}
    />
  );
}
