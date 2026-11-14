import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@repo/kit/primitives/overlays/popover';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { ChangePart } from './change-part';
import {
  type CheckDetail,
  ChecksDot,
  type ChecksState,
  PullRequestChecks,
  checksState,
  type PullRequestChecksProps,
} from './pull-request-checks';

// What needs you comes first: failing checks, then running, then passed.
const stateOrder = {
  failing: 0,
  running: 1,
  passed: 2,
} as const satisfies Record<ChecksState, number>;

const byState = (details: readonly CheckDetail[]): CheckDetail[] =>
  [...details].sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);

const stateLabel = {
  failing: 'Failing',
  running: 'Running',
  passed: 'Passed',
} as const satisfies Record<ChecksState, string>;

interface ChangeChecksProps {
  checks: PullRequestChecksProps;
  // Opens the Change in the Inspector, where a phone has no popover to open.
  onOpen: () => void;
}

// The checks part of a Change row: on the web a pointer over it lists each check by name in a popover; a phone opens the Change.
export function ChangeChecks(props: ChangeChecksProps): ReactElement {
  const { details } = props.checks;

  return details && Platform.OS === 'web' ? (
    <ChecksPopover {...props} details={details} />
  ) : (
    <ChecksPress {...props} />
  );
}

function ChecksPress({ checks, onOpen }: ChangeChecksProps): ReactElement {
  return (
    <ChangePart tone={checksState(checks)} onPress={onOpen}>
      <PullRequestChecks {...checks} compact />
    </ChangePart>
  );
}

type PopoverProps = ChangeChecksProps & { details: readonly CheckDetail[] };

function ChecksPopover({ checks, details }: PopoverProps): ReactElement {
  return (
    <Popover openOnHover>
      <PopoverTrigger>
        <ChangePart tone={checksState(checks)} aria-haspopup="dialog">
          <PullRequestChecks {...checks} compact />
        </ChangePart>
      </PopoverTrigger>
      <ChecksContent details={details} />
    </Popover>
  );
}

function ChecksContent(props: ChecksListProps): ReactElement {
  return (
    <PopoverContent align="start" accessibilityLabel="CI Checks" list>
      <PopoverTitle>CI Checks</PopoverTitle>
      <ChecksList {...props} />
    </PopoverContent>
  );
}

interface ChecksListProps {
  details: readonly CheckDetail[];
}

function ChecksList(props: ChecksListProps): ReactElement {
  return (
    <List appearance="plain" fit>
      <ListSection>
        {byState(props.details).map((check) => (
          <CheckRow key={check.name} {...check} />
        ))}
      </ListSection>
    </List>
  );
}

function CheckRow({ name, state }: CheckDetail): ReactElement {
  return (
    <ListItem
      title={name}
      value={stateLabel[state]}
      leading={<ChecksDot state={state} />}
    />
  );
}
