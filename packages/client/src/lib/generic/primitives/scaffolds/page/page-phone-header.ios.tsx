// iOS uses UIKit bar items and the stock search bar; Android uses its Toolbar and a Compose FAB.
import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import {
  ActionListHeaderContext,
  type DeclaredAction,
} from '#primitives/actions/action-list';
import { headerActions } from './page-action-groups';
import type { PageProps } from './page-props';
import { PageSearchBar } from './page-search-bar.ios';
import { docksSearch } from './page-search-placement';
import { overflowMenu, toolbarButton } from './page-toolbar-items.ios';
import { usePageActions } from './use-page-actions';

const titleOptions = {
  headerTitleAlign: 'center',
  headerTransparent: false,
  headerLargeTitleEnabled: false,
} as const;

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
  const { register, actions, label } = usePageActions();
  const docked = Boolean(props.search && docksSearch);

  const header = { ...props, declared: actions, label, docked };

  return (
    <ActionListHeaderContext value={register}>
      {props.actions}
      <HeaderItems {...header} />
      {props.search ? <PageSearchBar {...props} /> : null}
    </ActionListHeaderContext>
  );
}

type HeaderProps = PageProps & {
  declared: DeclaredAction[];
  label: string;
  docked: boolean;
};

function HeaderItems(props: HeaderProps): ReactElement {
  const primary = props.docked ? undefined : props.primaryAction;

  const { direct, overflow } = headerActions(
    props.declared,
    availableSlots(primary),
  );

  return (
    <Stack.Toolbar placement="right">
      {direct.map(toolbarButton)}
      {overflowMenu(overflow, props.label)}
      {primary ? toolbarButton({ ...primary, id: 'primary' }) : null}
    </Stack.Toolbar>
  );
}

function availableSlots(primary: PageProps['primaryAction']): number {
  return primary ? 1 : 2;
}
