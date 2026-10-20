import type { IndexedNode, PageIndex } from './index-model.mts';
import type { Registry } from './model.mts';

type Named = { name: string; id: string };

type FileArea = { file: string; fileId: string; reason: string };

export type ExcludedArea =
  | FileArea
  | (FileArea & { page: Named })
  | (FileArea & { board: Named });

type CanonicalFile = { name: string; id: string };

type Parents = Map<string, Pick<IndexedNode, 'parentId'>>;

type Entry = { fileId: string; nodeId: string };

function part(area: ExcludedArea): Named | undefined {
  if ('page' in area) return area.page;

  return 'board' in area ? area.board : undefined;
}

function wholeFileArea(
  areas: ExcludedArea[],
  fileId: string,
): ExcludedArea | undefined {
  return areas.find((area) => area.fileId === fileId && !part(area));
}

function requestedFile<File extends CanonicalFile>(
  files: File[],
  areas: ExcludedArea[],
  fileId: string,
): File[] {
  const selected = files.filter((file) => file.id === fileId);

  if (!selected.length) throw new Error(`Not a canonical file: ${fileId}`);
  const area = wholeFileArea(areas, fileId);

  if (area)
    throw new Error(
      `${area.file} is excluded from paper-sync (${area.reason}). Remove it from excludedAreas in tools/paper-sync/config.mts to sync it.`,
    );

  return selected;
}

export function includedFiles<File extends CanonicalFile>(
  files: File[],
  areas: ExcludedArea[],
  fileId?: string,
): File[] {
  if (fileId) return requestedFile(files, areas, fileId);

  return files.filter((file) => !wholeFileArea(areas, file.id));
}

export function includedPages<Page extends { id: string }>(
  fileId: string,
  pages: Page[],
  areas: ExcludedArea[],
): Page[] {
  const skipped = new Set(
    areas.flatMap((area) =>
      area.fileId === fileId && 'page' in area ? [area.page.id] : [],
    ),
  );

  return pages.filter((page) => !skipped.has(page.id));
}

export function excludedBoards(
  fileId: string,
  areas: ExcludedArea[],
): Set<string> {
  return new Set(
    areas.flatMap((area) =>
      area.fileId === fileId && 'board' in area ? [area.board.id] : [],
    ),
  );
}

function parentOf(nodeId: string, parents: Parents): string | null {
  return parents.get(nodeId)?.parentId ?? null;
}

function ancestry(nodeId: string, parents: Parents): string[] {
  const ids = [nodeId];
  let parent = parentOf(nodeId, parents);

  while (parent && !ids.includes(parent)) {
    ids.push(parent);
    parent = parentOf(parent, parents);
  }

  return ids;
}

export function insideBoards(
  nodeId: string,
  parents: Parents,
  boards: Set<string>,
): boolean {
  return ancestry(nodeId, parents).some((id) => boards.has(id));
}

export function withoutBoards<Node extends IndexedNode>(
  nodes: Node[],
  boards: Set<string>,
): Node[] {
  if (!boards.size) return nodes;
  const parents = new Map(nodes.map((node) => [node.id, node]));

  return nodes.filter((node) => !insideBoards(node.id, parents, boards));
}

function pageIncluded(page: PageIndex, areas: ExcludedArea[]): boolean {
  if (wholeFileArea(areas, page.fileId)) return false;

  return includedPages(page.fileId, [{ id: page.pageId }], areas).length > 0;
}

export function includedIndices(
  pages: PageIndex[],
  areas: ExcludedArea[],
): PageIndex[] {
  return pages.flatMap((page) => {
    if (!pageIncluded(page, areas)) return [];
    const boards = excludedBoards(page.fileId, areas);

    return [{ ...page, nodes: withoutBoards(page.nodes, boards) }];
  });
}

function entryFilter(
  areas: ExcludedArea[],
  scannedNodes: { fileId: string; id: string }[],
): (entry: Entry) => boolean {
  const partial = new Set(
    areas.flatMap((area) => (part(area) ? [area.fileId] : [])),
  );

  const scanned = new Set(
    scannedNodes.map((node) => `${node.fileId}:${node.id}`),
  );

  return (entry) =>
    !wholeFileArea(areas, entry.fileId) &&
    (!partial.has(entry.fileId) ||
      scanned.has(`${entry.fileId}:${entry.nodeId}`));
}

export function includedRegistry(
  registry: Registry,
  areas: ExcludedArea[],
  scannedNodes: { fileId: string; id: string }[],
): Registry {
  const included = entryFilter(areas, scannedNodes);

  const families = registry.families.flatMap((family) =>
    included(family.master)
      ? [{ ...family, copies: family.copies.filter(included) }]
      : [],
  );

  return { ...registry, families };
}

function areaLabel(area: ExcludedArea): string {
  const named = part(area);

  return named ? `${area.file} / ${named.name}` : area.file;
}

export function skippedLine(areas: ExcludedArea[]): string | undefined {
  if (!areas.length) return undefined;
  const entries = areas.map((area) => `${areaLabel(area)} (${area.reason})`);

  return `Skipped: ${entries.join(', ')}`;
}
