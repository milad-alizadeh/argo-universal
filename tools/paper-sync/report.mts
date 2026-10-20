import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Catalog } from './catalog.mts';
import { excludedAreas } from './config.mts';
import type { Enrollment, Exclusion } from './enrollment-model.mts';
import { skippedLine } from './excluded-areas.mts';
import type { PageIndex, LocatedNode } from './index-model.mts';
import {
  masterReports,
  unenrolled,
  type MasterReport,
} from './report-data.mts';
import { saveJson } from './storage.mts';

type Scan = Omit<PageIndex, 'nodes'> & { nodeCount: number };

type Report = {
  masters: MasterReport[];
  noCopies: MasterReport[];
  duplicates: LocatedNode[][];
  unenrolled: Exclusion[];
  errors: Exclusion[];
  rebindings: Enrollment['rebindings'];
  scans: Scan[];
};

function duplicateLine(group: LocatedNode[]): string {
  const entries = group.map(
    (node) => `${node.name} (${node.fileId}/${node.id})`,
  );

  return `- ${entries.join(', ')}`;
}

function masterLines(master: MasterReport): string[] {
  return [
    `## ${master.name} (${master.copies.length})`,
    ...master.copies.map(
      (copy) =>
        `- ${copy.fileId} → ${copy.page} → ${copy.board} → ${copy.flow} (${copy.nodeId})`,
    ),
  ];
}

function scanMetrics(pages: PageIndex[]): Scan[] {
  return pages.map(({ nodes, ...page }) => ({
    ...page,
    nodeCount: nodes.length,
  }));
}

function reportData(
  catalog: Catalog,
  result: Enrollment,
  pages: PageIndex[],
): Report {
  const masters = masterReports(catalog, result);
  const noCopies = masters.filter((master) => !master.copies.length);
  const errors = { errors: result.excluded, rebindings: result.rebindings };

  const inventory = {
    duplicates: catalog.duplicates,
    unenrolled: unenrolled(catalog, result),
  };

  const lists = { masters, noCopies, scans: scanMetrics(pages) };

  return { ...lists, ...errors, ...inventory };
}

function problemLines(data: Report): string[] {
  const lines = ['## Unenrolled'];
  lines.push(
    ...data.unenrolled.map(
      (node) =>
        `- ${node.name} (${node.fileId}/${node.nodeId}): ${node.reason}`,
    ),
  );
  lines.push('## Duplicate masters', ...data.duplicates.map(duplicateLine));

  return lines;
}

function markdown(data: Report): string {
  const lines = data.masters.flatMap(masterLines);
  lines.push(
    '## Masters with no copies',
    ...data.noCopies.map((master) => `- ${master.name}`),
  );
  lines.push(...problemLines(data));
  lines.push('## Scans', ...data.scans.map(scanLine));
  const skipped = skippedLine(excludedAreas);

  if (skipped) lines.push(skipped);

  return `${lines.join('\n\n')}\n`;
}

export async function report(
  catalog: Catalog,
  result: Enrollment,
  options: { pages: PageIndex[]; directory: string },
): Promise<void> {
  const data = reportData(catalog, result, options.pages);
  await saveJson(join(options.directory, 'report.json'), data);
  await writeFile(join(options.directory, 'report.md'), markdown(data));
  console.log(
    `${data.masters.length} masters; ${data.noCopies.length} without copies; ${data.unenrolled.length} unenrolled; ${data.duplicates.length} duplicate names. Report: ${options.directory}`,
  );
}

function scanLine(scan: Scan): string {
  return `- ${scan.fileId} / ${scan.pageName}: ${scan.seconds.toFixed(1)}s, ${scan.calls} calls`;
}
