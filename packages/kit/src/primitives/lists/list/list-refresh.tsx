import { useMemo, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  Action,
  ActionShortcutScope,
  useDeclaredActions,
} from '#primitives/actions/action';
import {
  primaryModifier,
  shortcutKeys,
  type ActionShortcut,
} from '#primitives/content/kbd';
import { useListRequest, type ListLoad } from './list-request';

const refreshShortcut: ActionShortcut = { modifiers: ['meta'], key: 'r' };

const keys = shortcutKeys(refreshShortcut).join(
  primaryModifier() === 'meta' ? '' : '+',
);

const failure = {
  title: "Couldn't refresh",
  message: `Press ${keys} to try again.`,
};

interface RefreshProps {
  refresh?: ListLoad;
  children: ReactNode;
}

export function useListRefresh(_refresh?: ListLoad): ReactElement | undefined {
  return undefined;
}

function useRefreshAction(refresh: ListLoad): ReactElement {
  const { run } = useListRequest(failure);

  return useMemo(
    () => (
      <Action
        label="Refresh"
        shortcut={refreshShortcut}
        onPress={() => void run(refresh)}
      />
    ),
    [run, refresh],
  );
}

function RefreshShortcut(
  props: RefreshProps & { refresh: ListLoad },
): ReactElement {
  const declared = useDeclaredActions(
    useRefreshAction(props.refresh),
    true,
    true,
  );

  return (
    <View nativeID={declared.id} className="relative min-h-0 flex-1">
      {props.children}
    </View>
  );
}

// Desktop and web draw nothing for refresh: ⌘R runs it while focus is inside the List, in a scope of its own so two refreshable Lists never contend for the key.
export function ListRefreshShortcut(props: RefreshProps): ReactNode {
  const { refresh } = props;

  if (!refresh) return props.children;

  return (
    <ActionShortcutScope>
      <RefreshShortcut refresh={refresh}>{props.children}</RefreshShortcut>
    </ActionShortcutScope>
  );
}
