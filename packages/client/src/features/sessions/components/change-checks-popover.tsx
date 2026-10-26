import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@repo/kit/primitives/overlays/popover';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { ChangePart } from './change-part';
import {
  type CheckDetail,
  type ChecksState,
  PullRequestChecks,
  type PullRequestChecksProps,
} from './pull-request-checks';

const stateTone = {
  failing: 'danger',
  running: 'warning',
  passed: 'success',
} as const satisfies Record<ChecksState, string>;

const stateLabel = {
  failing: 'Failing',
  running: 'Running',
  passed: 'Passed',
} as const satisfies Record<ChecksState, string>;

interface ChangeChecksProps {
  checks: PullRequestChecksProps;
  // Opens the Change in the Stage, where a phone has no popover to open.
  onOpen: () => void;
}

// The checks part of a Change row: the web lists each check by name in a popover, a phone opens the Change.
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
    <ChangePart onPress={onOpen}>
      <PullRequestChecks {...checks} compact />
    </ChangePart>
  );
}

type PopoverProps = ChangeChecksProps & { details: readonly CheckDetail[] };

function ChecksPopover({ checks, details }: PopoverProps): ReactElement {
  return (
    <Popover>
      <PopoverTrigger>
        <ChangePart aria-haspopup="dialog">
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
        {props.details.map((check) => (
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
      leading={<StatusDot tone={stateTone[state]} />}
    />
  );
}
