import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { formatAge } from '#kit/format-elapsed';
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
    <Text role="secondary" tone="muted">
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
      <Text role="secondary" tone="success">
        {`+${totals.additions}`}
      </Text>
      <Text role="secondary" tone="danger">
        {`−${totals.deletions}`}
      </Text>
    </>
  );
}

const stateDrawing = {
  open: {
    text: 'Open',
    tone: 'success',
    fill: 'bg-success/14',
    icon: 'pr-open',
  },
  merged: {
    text: 'Merged',
    tone: 'done',
    fill: 'bg-done/14',
    icon: 'pr-merged',
  },
  closed: { text: 'Closed', tone: 'muted', fill: 'bg-tint', icon: 'pr-closed' },
  draft: { text: 'Draft', tone: 'muted', fill: 'bg-tint', icon: 'pr-draft' },
} as const;

function GitState({ data }: { data: GitItemPreview }): ReactElement {
  const drawing = stateDrawing[data.state ?? 'open'];

  return (
    <View className={stateClass(drawing.fill)}>
      <Icon {...stateIcon(data)} />
      <Text role="badge" tone={drawing.tone}>
        {drawing.text}
      </Text>
    </View>
  );
}

function stateIcon(data: GitItemPreview): ComponentProps<typeof Icon> {
  const drawing = stateDrawing[data.state ?? 'open'];

  return {
    name: data.kind === 'issue' ? issueIcon(data.state) : drawing.icon,
    size: 'sm',
    tone: drawing.tone,
  };
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

function issueIcon(
  state: GitItemPreview['state'],
): 'git-issue-open' | 'git-issue-closed' {
  return state === 'closed' ? 'git-issue-closed' : 'git-issue-open';
}
