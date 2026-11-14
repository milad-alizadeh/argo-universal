import { tintTransitionClassName } from '@repo/kit/motion';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { cn } from '@repo/kit/utils';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import type { ChangeActions } from '../hooks/use-change-selection';
import { changeKey, changeName } from './change-identity';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import { changeDescription } from './change-stage/change-stage-model';
import { ChangeStale, SignInButton } from './change-stale';
import { SessionChangeAttach } from './session-change-attach';
import { SessionChangeDiscovery } from './session-change-discovery';
import { SessionChangeUnread } from './session-change-unread';
import type { SessionPullRequest } from './session-pull-request';

export interface SessionChangeListProps {
  // Every Change the Session has, in the order the Plugins gave them, whatever its stage.
  changes: readonly SessionPullRequest[];
  // A row opens that Change's detail.
  onSelect: (change: SessionPullRequest) => void;
  // What a person can do to the Changes; absent where the page offers none of it.
  actions?: ChangeActions;
}

type RowProps = Pick<SessionChangeListProps, 'onSelect'> & {
  change: SessionPullRequest;
};

const rowClasses = cn(
  'min-h-9 flex-row items-start gap-3 rounded-lg px-3 py-2 web:hover:bg-hover web:active:bg-pressed web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
  tintTransitionClassName,
);

function RowText({ change }: Pick<RowProps, 'change'>): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text numberOfLines={1}>{change.title}</Text>
      <View className="flex-row flex-wrap items-center gap-x-2">
        <Text role="secondary" tone="muted" numberOfLines={1}>
          {changeName(change)}
        </Text>
        <ChangeStageModifier {...change} />
        <ChangeStale stale={change.stale} short />
      </View>
    </View>
  );
}

const rowLabel = (change: SessionPullRequest): string =>
  `Show Change ${changeName(change)}, ${change.title}, ${changeDescription(change)}`;

function Row({ change, onSelect }: RowProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={rowLabel(change)}
      onPress={() => onSelect(change)}
      className={rowClasses}
    >
      <View className="w-7 shrink-0 items-center pt-0.5">
        <ChangeStageIcon {...change} />
      </View>
      <RowText change={change} />
    </Pressable>
  );
}

interface RetryProps {
  actions: ChangeActions;
  show: boolean;
  // Some Change is stale because the person must sign in.
  signIn: boolean;
}

function RefreshControl(props: {
  show: boolean;
  onRefresh: () => void;
}): ReactElement | null {
  if (!props.show) return null;

  return (
    <View className="flex-row px-3 py-2">
      <Button size="sm" label="Refresh" onPress={props.onRefresh} />
    </View>
  );
}

function Retrying({ actions, show, signIn }: RetryProps): ReactElement {
  const retry = (): void => void actions.refresh();

  return (
    <>
      <View className="flex-row px-3">
        <SignInButton needed={signIn} onSignIn={actions.signIn} />
      </View>
      <SessionChangeUnread unread={actions.unread} onRetry={retry} />
      <RefreshControl show={show} onRefresh={retry} />
    </>
  );
}

const needSignIn = (changes: readonly SessionPullRequest[]): boolean =>
  changes.some(({ stale }) => stale === 'signIn');

function Finding({ actions }: { actions: ChangeActions }): ReactElement {
  return (
    <>
      <SessionChangeDiscovery
        onDiscover={actions.discover}
        onSignIn={actions.signIn}
      />
      <SessionChangeAttach onAttach={actions.attach} />
    </>
  );
}

type ControlsProps = Pick<SessionChangeListProps, 'changes'> & {
  actions: ChangeActions;
};

function Controls({ actions, changes }: ControlsProps): ReactElement {
  const signIn = needSignIn(changes);

  return (
    <>
      <Retrying actions={actions} show={changes.length > 0} signIn={signIn} />
      <Finding actions={actions} />
    </>
  );
}

// The Inspector's Changes list: every Change the Session has, which a row opens (ADR-0039). With none, it is the way to find or attach the first.
export function SessionChangeList(props: SessionChangeListProps): ReactElement {
  const { actions, changes, onSelect } = props;

  // A virtualised list (CODING_STANDARDS.md "App"), since a Session's Changes grow with each PR it opens; the controls end it.
  return (
    <List<SessionPullRequest>
      appearance="plain"
      accessibilityLabel="Changes"
      items={[...changes]}
      keyExtractor={changeKey}
      renderItem={(change) => <Row change={change} onSelect={onSelect} />}
      endContent={actions && <Controls actions={actions} changes={changes} />}
    />
  );
}
