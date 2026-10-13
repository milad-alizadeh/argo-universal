import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  FeedItem,
  PermissionOutcome,
  toFeedView,
} from '../../../src/features/feed';
import type { PermissionRequestProps } from '../../../src/features/requests';
import {
  agentOptionsProps,
  agentOptionsWithAlwaysReject,
  permissionMock,
  permissionProps,
} from '../../../src/features/requests/components/request.mocks';
import { RequestComposerPreview } from '../../request-composer';

export const answeredElsewhere = 'Already answered on another device';

type RecordedFeed = (typeof permissionMock)['pending'];

const deniedOutcome = {
  outcome: 'selected',
  optionId: 'reject_once',
  name: 'Deny',
  kind: 'reject_once',
} as const;

// The fixed states beside the one the controls drive.
export const galleryVariations: { label: string; preview: ReactNode }[] = [
  {
    label: 'Agent options',
    preview: <PermissionPreview {...agentOptionsProps({})} />,
  },
  {
    label: 'Several reject options',
    preview: (
      <PermissionPreview
        {...agentOptionsProps({ options: agentOptionsWithAlwaysReject })}
      />
    ),
  },
  {
    label: 'Deny with a message',
    preview: (
      <PermissionPreview
        {...permissionProps({
          feedback: true,
          denialMessage: 'Keep the cache. Run expo start --clear instead.',
        })}
      />
    ),
  },
  {
    label: 'Already answered',
    preview: (
      <PermissionPreview
        {...permissionProps({
          state: { kind: 'answered', reason: answeredElsewhere },
        })}
      />
    ),
  },
  {
    label: 'Awaiting approval',
    preview: <FeedGroups recorded={permissionMock.pending} />,
  },
  {
    label: 'Allowed once',
    preview: <FeedGroups recorded={permissionMock.answered} />,
  },
  { label: 'Denied', preview: <PermissionOutcome outcome={deniedOutcome} /> },
  {
    label: 'Denied with a message',
    preview: (
      <PermissionOutcome
        outcome={deniedOutcome}
        message="Don't force-push, open a new branch instead."
      />
    ),
  },
  {
    label: 'Chose another allow option',
    preview: (
      <PermissionOutcome
        outcome={{
          outcome: 'selected',
          optionId: 'allow-always',
          name: 'Always Allow',
          kind: 'allow_always',
        }}
      />
    ),
  },
  {
    label: 'Chose another reject option',
    preview: (
      <PermissionOutcome
        outcome={{
          outcome: 'selected',
          optionId: 'reject-always',
          name: 'Never allow',
          kind: 'reject_always',
        }}
      />
    ),
  },
];

function FeedGroups({ recorded }: { recorded: RecordedFeed }): ReactNode {
  return toFeedView(recorded.rows, recorded.snapshot)
    .items.filter((item) => item.type === 'group')
    .map((item) => <FeedItem key={item.id} item={item} imageUrl={() => ''} />);
}

export function PermissionPreview(
  props: PermissionRequestProps,
): React.JSX.Element {
  return <RequestComposerPreview permissionRequest={props} />;
}
