import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { ListItemInert } from '@repo/kit/primitives/lists/list-item';
import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import {
  ChangeStage,
  type ChangeStageProps,
  SecondaryChangeStageIcon,
} from '../change-stage/change-stage';
import { changeDescription } from '../change-stage/change-stage-model';
import { ShellsCount, SubagentsCount } from './session-row-meta-counts';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
import type { MoreEntry } from './session-row-more';
import { sidebarRows } from './session-row-sidebar';

export type { SessionRowMetadataProps } from './session-row-metadata-props';

// One part of a Regular row's meta line: how the line draws it, and how "+N" lists it once it no longer fits.
export interface MetaPart {
  line: React.ReactElement;
  entry: MoreEntry;
}

// Argo's own parts press the row: only the Plugins' items take presses of their own.
const inertPart = (entry: MoreEntry, line: React.ReactNode): MetaPart => ({
  line: <ListItemInert key={entry.key}>{line}</ListItemInert>,
  entry,
});

// How long ago the Session was active leads a sidebar row's line; a phone's row ends its title line with it.
function agePart({ age }: SessionRowMetadataProps): MetaPart[] {
  if (!sidebarRows || age === undefined) return [];

  return [
    inertPart(
      { key: 'age', text: age, source: 'Last active' },
      <Text role="secondary" tone="muted">
        {age}
      </Text>,
    ),
  ];
}

const changeText = (change: ChangeStageProps): string =>
  change.text ??
  (change.number === undefined
    ? changeDescription(change)
    : `#${change.number}`);

function pullRequestPart({ pullRequest }: SessionRowMetadataProps): MetaPart[] {
  if (!pullRequest) return [];

  const entry = {
    key: 'pull-request',
    text: changeText(pullRequest),
    leading: <SecondaryChangeStageIcon {...pullRequest} />,
    source: 'Change',
  };

  return [
    inertPart(
      entry,
      <ChangeStage {...pullRequest} testID="session-pull-request-slot" />,
    ),
  ];
}

// One kind of running work: its key, glyph and name, and how many run now.
interface RunningWork {
  key: 'shells' | 'subagents';
  icon: 'agent' | 'terminal';
  source: string;
  running: number;
}

function runningPart(work: RunningWork, line: React.ReactNode): MetaPart[] {
  if (work.running === 0) return [];

  const entry = {
    key: work.key,
    text: `${work.running} running`,
    leading: <Icon name={work.icon} />,
    source: work.source,
  };

  return [inertPart(entry, line)];
}

const shellsWork = {
  key: 'shells',
  icon: 'terminal',
  source: 'Background Tasks',
} as const;

const agentsWork = {
  key: 'subagents',
  icon: 'agent',
  source: 'Agents',
} as const;

function archivedPart({ session }: SessionRowMetadataProps): MetaPart[] {
  if (session.archivedAt === null) return [];

  return [
    inertPart(
      { key: 'archived', text: 'Archived' },
      <Pill text="Archived" tone="muted" />,
    ),
  ];
}

// The active Background Task and Agent counts, each with its running dot.
function runningParts(props: SessionRowMetadataProps): MetaPart[] {
  const { shells, subagents } = props.session;
  const shellsLine = <ShellsCount {...props} />;
  const agentsLine = <SubagentsCount {...props} />;

  return [
    ...runningPart({ ...shellsWork, running: shells.running }, shellsLine),
    ...runningPart({ ...agentsWork, running: subagents.running }, agentsLine),
  ];
}

// Time and Change lead the active Background Task and Agent counts; the Plugins' items follow them on the line.
export function argoMetaParts(props: SessionRowMetadataProps): MetaPart[] {
  return [
    ...agePart(props),
    ...pullRequestPart(props),
    ...runningParts(props),
    ...archivedPart(props),
  ];
}
