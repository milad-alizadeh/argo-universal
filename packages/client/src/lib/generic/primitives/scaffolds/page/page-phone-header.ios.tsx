// iOS uses UIKit bar items and the stock search bar; Android uses its Toolbar and a Compose FAB.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { headerActions, pageActions } from './page-action-groups';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import { docksSearch } from './page-search-placement';
import { overflowMenu, toolbarButton } from './page-toolbar-items.ios';

export function PagePhoneHeader(
  props: PageProps & { wide: boolean },
): ReactElement {
  const options = {
    ...titleOptions,
    title: props.title,
    headerShown: !props.wide,
  };

  return (
    <>
      <Stack.Screen options={options} />
      {props.wide ? null : <PageItems {...props} />}
    </>
  );
}

function PageItems(props: PageProps): ReactElement {
  const docked = Boolean(props.search && docksSearch);

  return (
    <>
      <HeaderItems {...props} docked={docked} />
      {props.search ? (
        <PageSearchBar search={props.search} action={props.primaryAction} />
      ) : null}
    </>
  );
}

function HeaderItems(props: PageProps & { docked: boolean }): ReactElement {
  const primary = props.docked ? undefined : props.primaryAction;

  const { direct, overflow } = headerActions(
    pageActions(props.actions),
    availableSlots(primary),
  );

  return (
    <Stack.Toolbar placement="right">
      {direct.map(toolbarButton)}
      {overflowMenu(overflow)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}

const titleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

function availableSlots(primary: PageProps['primaryAction']): number {
  return primary ? 1 : 2;
}
