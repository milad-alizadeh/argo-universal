import { z } from 'zod';
import type { PaperPort } from './paper-port.mts';
import { stylesSchema, type Styles } from './snapshot-model.mts';

// Typed reads of the Paper MCP tools the drift tools use; each payload is parsed at the seam.
const namedSchema = z.object({ id: z.string(), name: z.string() });
const basicInfoSchema = z.object({
  pages: z.array(namedSchema),
  artboards: z.array(namedSchema),
});
const treeSummarySchema = z.object({ summary: z.string() });
const childrenSchema = z.object({ children: z.array(namedSchema) });
const computedStylesSchema = z.object({
  styles: z.record(z.string(), stylesSchema),
});
const tokensSchema = z.object({
  tokens: z.array(z.object({ name: z.string(), value: z.string() })),
});
const nodeInfoSchema = z.object({
  name: z.string(),
  childIds: z.array(z.string()),
  textContent: z.string().nullish(),
});
export type NodeInfo = z.infer<typeof nodeInfoSchema>;

export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type Named = z.infer<typeof namedSchema>;

export async function readBasicInfo(
  paper: PaperPort,
  pageId?: string,
): Promise<BasicInfo> {
  return basicInfoSchema.parse(
    await paper.call('get_basic_info', pageId ? { pageId } : {}),
  );
}

export async function readTreeSummary(
  paper: PaperPort,
  nodeId: string,
): Promise<string> {
  const payload = await paper.call('get_tree_summary', { nodeId, depth: 10 });
  return treeSummarySchema.parse(payload).summary;
}

export async function readChildren(
  paper: PaperPort,
  nodeId: string,
): Promise<Named[]> {
  const payload = await paper.call('get_children', { nodeId });
  return childrenSchema.parse(payload).children;
}

export async function readComputedStyles(
  paper: PaperPort,
  nodeIds: string[],
): Promise<Record<string, Styles>> {
  const payload = await paper.call('get_computed_styles', { nodeIds });
  return computedStylesSchema.parse(payload).styles;
}

export async function readTokens(
  paper: PaperPort,
): Promise<Record<string, string>> {
  const payload = await paper.call('get_tokens', { format: 'json' });
  return Object.fromEntries(
    tokensSchema
      .parse(payload)
      .tokens.map((token): [string, string] => [token.name, token.value]),
  );
}

export async function readNodeInfo(
  paper: PaperPort,
  nodeId: string,
): Promise<NodeInfo> {
  return nodeInfoSchema.parse(await paper.call('get_node_info', { nodeId }));
}

export async function readText(
  paper: PaperPort,
  nodeId: string,
): Promise<string> {
  return (await readNodeInfo(paper, nodeId)).textContent ?? '';
}

// The layer and its descendants as JSX with inline styles; the JSX carries no layer ids.
export async function readJsx(
  paper: PaperPort,
  nodeId: string,
): Promise<string> {
  const payload = await paper.call('get_jsx', {
    nodeId,
    format: 'inline-styles',
  });
  return z.string().parse(payload);
}
