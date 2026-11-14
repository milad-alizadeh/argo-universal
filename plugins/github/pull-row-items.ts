import type { SessionRowItem } from '@argo/plugin-kit';
import type { LinkRead } from './pull-changes';
import type { PullInfo } from './pull-info';

// A Session row holds at most this many items from one Plugin (the Slot's own limit).
const rowItemLimit = 8;

const tooltipLimit = 200;

// The Plugin's own icon: a Session row item names an SF or Material symbol, never a kit drawing.
const pullIcon = { sf: 'arrow.triangle.pull', material: 'merge_type' } as const;

// How each stage reads, in the tone the Workbench draws it in.
const stages = {
  open: { text: 'Open', tone: 'success' },
  merged: { text: 'Merged', tone: 'done' },
  closed: { text: 'Closed', tone: 'danger' },
} as const satisfies Record<
  PullInfo['stage'],
  { text: string; tone: SessionRowItem['tone'] }
>;

function details({
  link,
  pull,
}: LinkRead): Pick<SessionRowItem, 'tone' | 'tooltip'> {
  // The number comes from the association; the details are the last good read, if there ever was one.
  if (!pull.data) return { tooltip: `Pull request #${link.number}` };

  const { text, tone } = stages[pull.data.stage];

  return {
    tone,
    tooltip: `${pull.data.title} · ${text}`.slice(0, tooltipLimit),
  };
}

const rowItem = (read: LinkRead): SessionRowItem => ({
  icon: pullIcon,
  text: `#${read.link.number}`,
  ...details(read),
});

// One item per pull request attached to each Session, in the order the Changes Slot lists them; a Session without one has no key.
export function rowItemsBySession(
  reads: readonly LinkRead[],
): Record<string, SessionRowItem[]> {
  return Object.fromEntries(
    Object.entries(Object.groupBy(reads, ({ link }) => link.sessionId)).map(
      ([sessionId, group]) => [
        sessionId,
        (group ?? []).slice(0, rowItemLimit).map(rowItem),
      ],
    ),
  );
}
