import type { ReactElement } from 'react';
import { View } from 'react-native';
import { formatAge } from '#kit/format-elapsed';
import { changeMarks, issueMarks, type StageMark } from '#kit/stage-marks';
import { useClock } from '#kit/use-clock';
import { cn } from '#kit/utils';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { GitPreview, GitItemPreview } from './link-preview-card-props';
import { PreviewSecondary } from './link-preview-card-text';

export function GitCard({ data }: { data: GitPreview }): ReactElement {
  return (
    <View className="gap-1.5 p-3">
      <GitHeader data={data} />
      <Text role="body" numberOfLines={2}>
        {data.title}
      </Text>
      <GitFooter data={data} />
    </View>
  );
}

function GitHeader({ data }: { data: GitPreview }): ReactElement {
  return (
    <View className="flex-row items-center gap-1.5">
      <GitIdentity data={data} />
      <PreviewSecondary>{gitLabel(data)}</PreviewSecondary>
      <PreviewAge createdAt={data.createdAt} />
    </View>
  );
}

function PreviewAge({ createdAt }: { createdAt: string }): ReactElement {
  const now = useClock(false);

  return (
    <Text role="secondary" tone="muted" className="shrink-0">
      {formatAge(now - Date.parse(createdAt))} ago
    </Text>
  );
}

function gitLabel(data: GitPreview): string {
  return data.kind === 'commit'
    ? data.repository
    : `${data.repository} #${data.number}`;
}

function GitIdentity({ data }: { data: GitPreview }): ReactElement {
  if (data.kind !== 'commit') return <GitState data={data} />;

  return (
    <>
      <Icon name="commit" tone="muted" />
      <Text role="code" tone="muted">
        {data.sha}
      </Text>
    </>
  );
}

function GitFooter({ data }: { data: GitPreview }): ReactElement {
  return (
    <View className="flex-row items-center gap-1.5">
      <PreviewAuthor data={data} />
      <PreviewSecondary>{data.author}</PreviewSecondary>
      <GitDiff data={data} />
    </View>
  );
}

function PreviewAuthor({ data }: { data: GitPreview }): ReactElement {
  return (
    <Avatar
      size="sm"
      initials={data.author.charAt(0).toUpperCase()}
      accessibilityLabel={data.author}
      source={data.avatar ? { uri: data.avatar } : undefined}
    />
  );
}

function GitDiff({ data }: { data: GitPreview }): ReactElement | null {
  if (data.kind !== 'pullRequest') return null;

  return <DiffTotals data={data} />;
}

function DiffTotals({ data }: { data: GitItemPreview }): ReactElement {
  const totals = diffTotals(data);

  return (
    <>
      <Text role="secondary" tone="success" className="shrink-0">
        {`+${totals.additions}`}
      </Text>
      <Text role="secondary" tone="danger" className="shrink-0">
        {`−${totals.deletions}`}
      </Text>
    </>
  );
}

// The ink and the pill fill each tone of a mark draws in here.
const drawings = {
  success: { ink: 'success', fill: 'bg-success/14' },
  done: { ink: 'done', fill: 'bg-done/14' },
  danger: { ink: 'danger', fill: 'bg-danger/14' },
  neutral: { ink: 'muted', fill: 'bg-tint' },
} as const;

type State = Pick<GitItemPreview, 'kind' | 'state'>;

// An Issue is open or closed; a pull request has every Stage a Change with one can be at.
const issueMark = ({ state }: State): StageMark =>
  issueMarks[state === 'closed' ? 'closed' : 'open'];

const markOf = (data: State): StageMark =>
  data.kind === 'issue' ? issueMark(data) : changeMarks[data.state ?? 'open'];

function GitState({ data }: { data: GitItemPreview }): ReactElement {
  const mark = markOf(data);
  const { ink, fill } = drawings[mark.tone];

  return (
    <View className={stateClass(fill)}>
      <GitStateIcon data={data} />
      <Text role="badge" tone={ink}>
        {mark.label}
      </Text>
    </View>
  );
}

// The state's icon alone, drawn beside a link so its state reads without a hover.
export function GitStateIcon({ data }: { data: State }): ReactElement {
  const mark = markOf(data);

  return <Icon name={mark.icon} size="sm" tone={drawings[mark.tone].ink} />;
}

function stateClass(fill: string): string {
  return cn(
    'shrink-0 flex-row items-center gap-1 rounded-full px-2 py-0.5',
    fill,
  );
}

type DiffTotals = { additions: number; deletions: number };

function diffTotals(data: GitItemPreview): DiffTotals {
  return { additions: data.additions ?? 0, deletions: data.deletions ?? 0 };
}
