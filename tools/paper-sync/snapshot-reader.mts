import { z } from 'zod';
import { isNamedComponent } from './boundaries.mts';
import type { PaperClient } from './client.mts';
import {
  nodeSchema,
  required,
  stylesSchema,
  type DesignNode,
  type PaperNode,
  type Snapshot,
  type Styles,
} from './model.mts';
import { svgFromJsx } from './svg.mts';

const stylesResponse = z.object({ styles: z.record(z.string(), stylesSchema) });

export class SnapshotReader {
  private nodes = new Map<string, Promise<PaperNode>>();
  private styles = new Map<string, Styles>();
  private svgs = new Map<string, string>();
  private client: PaperClient;
  private names: Set<string>;
  public constructor(client: PaperClient, names = new Set<string>()) {
    this.client = client;
    this.names = names;
  }

  private node(fileId: string, nodeId: string): Promise<PaperNode> {
    const key = `${fileId}:${nodeId}`;

    if (!this.nodes.has(key))
      this.nodes.set(
        key,
        this.client.read('get_node_info', { fileId, nodeId }, nodeSchema),
      );

    return required(this.nodes.get(key));
  }

  private async tree(fileId: string, rootId: string): Promise<PaperNode[]> {
    const queue = [rootId];
    const nodes: PaperNode[] = [];
    const seen = new Set<string>();

    while (queue.length) {
      const batch = await Promise.all(
        queue.splice(0, 12).map((id) => this.node(fileId, id)),
      );

      for (const node of batch)
        this.acceptNode(node, { rootId, queue, nodes, seen });
    }

    return nodes;
  }

  private acceptNode(
    node: PaperNode,
    walk: {
      rootId: string;
      queue: string[];
      nodes: PaperNode[];
      seen: Set<string>;
    },
  ): void {
    if (walk.seen.has(node.id))
      throw new Error(`Repeated or cyclic node ${node.id}`);
    walk.seen.add(node.id);
    walk.nodes.push(node);

    this.queueChildren(node, walk.rootId, walk.queue);
  }
  private isNested(node: PaperNode, rootId: string): boolean {
    return node.id !== rootId && isNamedComponent(node, this.names);
  }
  private queueChildren(
    node: PaperNode,
    rootId: string,
    queue: string[],
  ): void {
    if (node.component === 'SVG') return;

    if (!this.isNested(node, rootId)) queue.push(...node.childIds);
  }

  private async cacheStyles(fileId: string, nodes: PaperNode[]): Promise<void> {
    const missing = nodes.filter(
      (node) => !this.styles.has(`${fileId}:${node.id}`),
    );

    for (let offset = 0; offset < missing.length; offset += 40) {
      const nodeIds = missing.slice(offset, offset + 40).map((node) => node.id);

      const result = await this.client.read(
        'get_computed_styles',
        { fileId, nodeIds },
        stylesResponse,
      );

      for (const id of nodeIds)
        this.styles.set(`${fileId}:${id}`, required(result.styles[id]));
    }
  }

  private async svg(fileId: string, node: PaperNode): Promise<string | null> {
    if (node.component !== 'SVG') return null;
    const key = `${fileId}:${node.id}`;

    if (this.svgs.has(key)) return required(this.svgs.get(key));

    const svg = await this.readSvg(fileId, node.id);
    this.svgs.set(key, svg);

    return svg;
  }
  private async readSvg(fileId: string, nodeId: string): Promise<string> {
    const blocks = await this.client.call('get_jsx', {
      fileId,
      nodeId,
      format: 'inline-styles',
    });

    const jsx = required(
      blocks.find((block) => block.trimStart().startsWith('(')),
    );

    return svgFromJsx(jsx);
  }

  private async designNode(
    fileId: string,
    node: PaperNode,
    rootId: string,
  ): Promise<DesignNode> {
    const nested = this.isNested(node, rootId);

    return {
      ...node,
      component: designKind(node.component),
      nested,
      childIds: this.childIds(node, nested),
      styles: nested ? {} : required(this.styles.get(`${fileId}:${node.id}`)),
      svg: await this.svg(fileId, node),
    };
  }

  public async read(fileId: string, rootId: string): Promise<Snapshot> {
    const nodes = await this.tree(fileId, rootId);
    await this.cacheStyles(fileId, nodes);
    const result: DesignNode[] = [];

    for (const node of nodes)
      result.push(await this.designNode(fileId, node, rootId));

    return { fileId, rootId, nodes: result };
  }
  private childIds(node: PaperNode, nested: boolean): string[] {
    if (nested || node.component === 'SVG') return [];

    return node.childIds;
  }
}

export function designKind(component: string): string {
  return component === 'Rectangle' ? 'Frame' : component;
}
