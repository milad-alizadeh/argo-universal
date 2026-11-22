import { Text } from '@repo/kit/primitives/content/text';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { ChangeChecks } from './change-checks-popover';
import { ChangeDiffTotal } from './change-diff-total';
import { ChangeContextMenu, ChangeMenu } from './change-row-menu';
import { ChangeStageIcon } from './change-stage/change-stage';
import type { SessionPullRequest } from './session-pull-request';

export interface ChangeRowProps {
  change: SessionPullRequest;
  // Open the Change on its code host.
  onOpen: () => void;
  // Copy the Change's link, and take it off the Session; the menu leaves out an item with no handler.
  onCopyLink?: () => void;
  onDetach?: () => void;
  // Opens the Checkout's Changes against main from the diff total; without it the total is plain text.
  onOpenFiles?: () => void;
  // Ticks or unticks an automation the Change offers; the menu leaves the automation items out without it.
  onSetAutomation?: SessionPullRequest['onSetAutomation'];
}

// The total opens the Checkout's own Changes, never the pull request's files (ADR-0052), so it says so.
export const checkoutChangesLabel = "Show the Checkout's Changes against main";

const rowClassName = 'flex-row items-start gap-2 px-1 py-2';

// The mark sits on a disc of the leading mark's size, as every row's leading mark does, so it leads the row on the title's edge.
const stageCell = (change: SessionPullRequest): ReactElement => (
  <View className="shrink-0">
    <ChangeStageIcon {...change} form="disc" disc="leading" />
  </View>
);

export function ChangeRow(props: ChangeRowProps): ReactElement {
  return (
    <ChangeContextMenu {...props}>
      <View className={rowClassName}>
        {stageCell(props.change)}
        <View className="min-w-0 flex-1 gap-0.5">
          <ChangeHeading {...props} />
          <ChangeMeta {...props} />
        </View>
      </View>
    </ChangeContextMenu>
  );
}

// The title and the menu on one line; the meta below spans both, so its checks sit under the menu.
function ChangeHeading(props: ChangeRowProps): ReactElement {
  return (
    <View className="flex-row items-start gap-2">
      <View className="min-w-0 flex-1">
        <ChangeTitle {...props} />
      </View>
      <ChangeMenu {...props} />
    </View>
  );
}

// The title is the link to the Change; a pointer over it underlines it (the decoration reaches the Text from its parent), the rest of the row stays still.
function ChangeTitle({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open Change #${change.number} on GitHub`}
      onPress={onOpen}
      className="max-w-full self-start web:hover:underline"
    >
      <Text numberOfLines={1}>{change.title}</Text>
    </Pressable>
  );
}

const checksPart = (
  checks: NonNullable<SessionPullRequest['checks']>,
  onOpen: () => void,
): ReactElement => (
  <View className="ml-auto">
    <ChangeChecks checks={checks} onOpen={onOpen} />
  </View>
);

const rateLimitLabel = 'GitHub rate limit reached';

// The code host would not say how the checks stand, so a dash holds their place and a pointer over it says why.
const rateLimitedPart = (): ReactElement => (
  <View className="ml-auto">
    <Tooltip label={rateLimitLabel}>
      <Pressable
        accessibilityLabel={`CI Checks unknown, ${rateLimitLabel}`}
        className="px-1"
      >
        <Text role="secondary" tone="muted">
          –
        </Text>
      </Pressable>
    </Tooltip>
  </View>
);

function trailingPart(
  change: SessionPullRequest,
  onOpen: () => void,
): ReactElement | undefined {
  if (change.stale === 'rateLimited') return rateLimitedPart();

  return change.checks && checksPart(change.checks, onOpen);
}

// The diff total on the Checkout's own Change opens the Checkout's Changes; a pointer over it underlines it as the title does.
const pressableTotal = (
  total: ReactElement,
  onOpenFiles: () => void,
): ReactElement => (
  <Pressable
    role="button"
    accessibilityLabel={checkoutChangesLabel}
    onPress={onOpenFiles}
    className="web:hover:underline"
  >
    {total}
  </Pressable>
);

function DiffTotalPart({
  change,
  onOpenFiles,
}: Pick<ChangeRowProps, 'change' | 'onOpenFiles'>): ReactElement | undefined {
  if (!change.summary) return undefined;

  const total = <ChangeDiffTotal {...change.summary} icon />;

  return onOpenFiles ? pressableTotal(total, onOpenFiles) : total;
}

// The number and the diff total, with the checks at the trailing edge, under the menu; the checks list each check on the web, and on a phone open the Change.
function ChangeMeta({
  change,
  onOpen,
  onOpenFiles,
}: ChangeRowProps): ReactElement {
  return (
    <View className="min-h-6 flex-row flex-wrap items-center gap-2">
      <Text role="secondary" tone="muted">
        #{change.number}
      </Text>
      <DiffTotalPart change={change} onOpenFiles={onOpenFiles} />
      {trailingPart(change, onOpen)}
    </View>
  );
}
