import { join } from 'node:path';
import { z } from 'zod';
import type { PaperClient } from './client.mts';
import { selectedFiles } from './config.mts';
import { indexPage } from './discover.mts';
import { fileSchema, pageIndexSchema, type PageIndex } from './index-model.mts';
import { saveJson, loadJson } from './storage.mts';

type ScanOptions = { cache: string; fileId?: string };

type Page = { id: string; name: string };

type PageTarget = { fileId: string; page: Page };

function measured(target: PageTarget, nodes: PageIndex['nodes']): PageIndex {
  const { fileId, page } = target;
  const timing = { scannedAt: new Date().toISOString(), seconds: 0, calls: 0 };

  return {
    fileId,
    pageId: page.id,
    pageName: page.name,
    revision: null,
    nodes,
    ...timing,
  };
}

async function scanPage(
  client: PaperClient,
  target: PageTarget,
): Promise<PageIndex> {
  const start = performance.now();
  const callsBefore = client.calls;
  const { fileId, page } = target;

  const args = { fileId, pageId: page.id };
  const info = await client.read('get_basic_info', args, fileSchema);

  const nodes = await indexPage(client, fileId, info.rootNodeId);
  const seconds = (performance.now() - start) / 1000;
  const calls = client.calls - callsBefore;

  return { ...measured(target, nodes), seconds, calls };
}

function scanSummary(name: string, pages: PageIndex[]): void {
  const count = pages.reduce((sum, page) => sum + page.nodes.length, 0);
  const seconds = pages.reduce((sum, page) => sum + page.seconds, 0);
  console.log(`${name}: ${count} nodes; ${seconds.toFixed(1)}s`);
}

async function scanFile(
  client: PaperClient,
  options: { cache: string; fileId: string },
): Promise<void> {
  const { fileId } = options;
  const info = await client.read('get_basic_info', { fileId }, fileSchema);
  const pages: PageIndex[] = [];

  for (const page of info.pages.filter((entry) => entry.type === 'page')) {
    const index = await scanPage(client, { fileId, page });
    await saveJson(join(options.cache, fileId, `${page.id}.json`), index);
    pages.push(index);
  }

  await savePageIds(options.cache, fileId, pages);
  scanSummary(info.fileName, pages);
}

export async function scan(
  client: PaperClient,
  options: ScanOptions,
): Promise<void> {
  for (const file of selectedFiles(options.fileId))
    await scanFile(client, { cache: options.cache, fileId: file.id });
}

async function cachedPages(
  cache: string,
  fileId: string,
): Promise<PageIndex[]> {
  const ids = await loadJson(
    join(cache, `${fileId}.json`),
    z.array(z.string()),
  );

  const pages: PageIndex[] = [];

  for (const id of ids)
    pages.push(
      await loadJson(join(cache, fileId, `${id}.json`), pageIndexSchema),
    );

  return pages;
}

export async function readIndices(cache: string): Promise<PageIndex[]> {
  const pages: PageIndex[] = [];

  for (const file of selectedFiles())
    pages.push(...(await cachedPages(cache, file.id)));

  return pages;
}

async function savePageIds(
  cache: string,
  fileId: string,
  pages: PageIndex[],
): Promise<void> {
  await saveJson(
    join(cache, `${fileId}.json`),
    pages.map((page) => page.pageId),
  );
}
