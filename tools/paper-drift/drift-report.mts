import type { CopyDrift, LayerDrift } from './drift-model.mts';
import { layerAt, layerPath, type Snapshot } from './snapshot-model.mts';
import type { StyleChange } from './style-diff.mts';

// Markdown for copies and variations that drifted, grouped by master.
function valueText(value: string | undefined): string {
  return value === undefined ? 'unset' : `\`${value}\``;
}

function changeLine(change: StyleChange): string {
  const note = change.sameValue ? ' (same value)' : '';
  return `${change.property}: ${valueText(change.master)} → ${valueText(change.copy)}${note}`;
}

function whereOf(found: LayerDrift): string {
  return `\`${found.path || 'root'}\` ${found.layer}`;
}

function layerLines(found: LayerDrift): string[] {
  if (found.problem) return [`  - ${whereOf(found)} ${found.problem}`];
  const changes = (found.changes ?? []).map(changeLine).join('; ');
  return [`  - ${whereOf(found)}: ${changes}`];
}

function pathOf(snapshot: Snapshot, id: string): string {
  const layer = snapshot.layers[id];
  return layer ? layerPath(snapshot, layer) : id;
}

function findingLines(snapshot: Snapshot, finding: CopyDrift): string[] {
  return [
    `- ${pathOf(snapshot, finding.copyId)}`,
    ...finding.drift.flatMap(layerLines),
  ];
}

function byMaster(findings: CopyDrift[]): CopyDrift[][] {
  const groups = new Map<string, CopyDrift[]>();
  for (const finding of findings)
    groups.set(finding.master, [
      ...(groups.get(finding.master) ?? []),
      finding,
    ]);
  return [...groups.values()].toSorted((a, b): number => b.length - a.length);
}

function groupLines(snapshot: Snapshot, group: CopyDrift[]): string[] {
  const [first] = group;
  if (!first) return [];
  return [
    `### ${first.master} (${group.length})`,
    `Master: ${layerPath(snapshot, layerAt(snapshot, first.masterId))}`,
    '',
    ...group.flatMap((finding): string[] => findingLines(snapshot, finding)),
    '',
  ];
}

export function driftSection(
  snapshot: Snapshot,
  title: string,
  findings: CopyDrift[],
): string[] {
  const groups = byMaster(findings);
  if (groups.length === 0) return [`## ${title}`, '', 'None.', ''];
  return [
    `## ${title}`,
    '',
    ...groups.flatMap((group): string[] => groupLines(snapshot, group)),
  ];
}
