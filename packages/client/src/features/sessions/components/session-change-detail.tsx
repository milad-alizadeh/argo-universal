import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type { ReactElement } from 'react';
import { Linking, View } from 'react-native';
import { ChangeDiffTotal } from './change-diff-total';
import { changeName } from './change-identity';
import { ChangeStage } from './change-stage/change-stage';
import { StaleBar } from './change-stale';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionPullRequest } from './session-pull-request';

export interface SessionChangeDetailProps {
  // The one Change this detail is for; it never shows another.
  change: SessionPullRequest;
  // Back to the list of Changes.
  onBack: () => void;
  // Detaches this Change from the Session; absent where the page offers no such control.
  onDetach?: (change: SessionPullRequest) => void;
  // Reads the Changes again; absent where the page offers no such control.
  onRefresh?: () => void;
}

function BackBar({
  onBack,
}: Pick<SessionChangeDetailProps, 'onBack'>): ReactElement {
  return (
    <View className="h-11 shrink-0 flex-row items-center pl-1.5">
      <IconButton
        variant="ghost"
        size="md"
        icon="chevron-left"
        accessibilityLabel="Back to Changes"
        onPress={onBack}
      />
    </View>
  );
}

const branchLine = ({ branch, base }: SessionPullRequest): string | undefined =>
  branch && (base ? `${branch} into ${base}` : branch);

const muted = (text: string): ReactElement => (
  <Text key={text} role="secondary" tone="muted">
    {text}
  </Text>
);

// The facts GitHub gave: which Change it is, its branches and its totals, where they are known.
function Facts({ change }: { change: SessionPullRequest }): ReactElement {
  const branch = branchLine(change);

  return (
    <Stack direction="column" gap={1}>
      {muted(changeName(change))}
      {branch && muted(branch)}
      {change.summary && <ChangeDiffTotal {...change.summary} icon />}
    </Stack>
  );
}

const openOnGitHub = (url: string): ReactElement => (
  <Button
    size="sm"
    label="Open on GitHub"
    onPress={() => void Linking.openURL(url)}
  />
);

function Actions({
  change,
  onDetach,
}: Pick<SessionChangeDetailProps, 'change' | 'onDetach'>): ReactElement {
  return (
    <Stack direction="row" gap={2}>
      {change.url && openOnGitHub(change.url)}
      {onDetach && (
        <Button size="sm" label="Detach" onPress={() => onDetach(change)} />
      )}
    </Stack>
  );
}

function Heading({ title }: { title: string }): ReactElement {
  return (
    <Text role="heading" accessibilityRole="heading" aria-level={3}>
      {title}
    </Text>
  );
}

function Body(props: SessionChangeDetailProps): ReactElement {
  const { change } = props;

  return (
    <Stack direction="column" gap={3}>
      <ChangeStage {...change} />
      <StaleBar change={change} onRefresh={props.onRefresh} />
      <Heading title={change.title} />
      <Facts change={change} />
      {change.checks && <PullRequestChecks {...change.checks} />}
      <Actions change={change} onDetach={props.onDetach} />
    </Stack>
  );
}

// Paper / Change detail: one PR's stage, title, facts and checks, with the way back to the list.
export function SessionChangeDetail(
  props: SessionChangeDetailProps,
): ReactElement {
  return (
    <View>
      <BackBar onBack={props.onBack} />
      <Body {...props} />
    </View>
  );
}
