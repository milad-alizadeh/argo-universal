import type { WireNode } from '@repo/contracts/plugins/wire';
import { runtimeError } from './runtime-protocol';
import { validateNumericAttribute } from './svg-numeric-validation';
import { visualPropsReason, visualSchemas } from './visual-props';

export const canvasElementLimit = 20_000;

export const canvasDepthLimit = 16;

type Scene = { count: number };

export function canvasReason(
  root: WireNode,
  partial = false,
): string | undefined {
  try {
    checkChildren(root, { count: 0 }, { depth: 0, partial });

    return undefined;
  } catch (error) {
    return runtimeError(error);
  }
}

type Context = { depth: number; partial: boolean };

function checkChildren(node: WireNode, scene: Scene, context: Context): void {
  if (Object.keys(node.slots).length)
    throw new Error('Canvas shapes must be children');
  const keys = new Set<string>();

  for (const child of node.children) {
    checkKey(child.key, keys);
    checkDrawing(child, scene, context);
  }
}

function checkDrawing(node: WireNode, scene: Scene, context: Context): void {
  scene.count += 1;
  checkLimits(scene.count, context.depth + 1);

  if (!isDrawing(node.type)) throw new Error(`shape ${node.type} refused`);
  const reason = visualPropsReason(node.type, node.props, context.partial);

  if (reason) throw new Error(`${node.type}#${node.key}: ${reason}`);
  checkPath(node);
  checkDrawingChildren(node, scene, context);
}

function checkDrawingChildren(
  node: WireNode,
  scene: Scene,
  context: Context,
): void {
  if (node.type !== 'Canvas.Group' && node.children.length)
    throw new Error(`only Canvas.Group can contain shapes`);
  checkChildren(node, scene, { ...context, depth: context.depth + 1 });
}

function checkKey(key: string, keys: Set<string>): void {
  if (!key) throw new Error('every Canvas shape needs a key');

  if (keys.has(key)) throw new Error(`duplicate shape key ${key}`);
  keys.add(key);
}

function checkLimits(count: number, depth: number): void {
  if (count > canvasElementLimit)
    throw new Error(`shape cap exceeded (${canvasElementLimit})`);

  if (depth > canvasDepthLimit)
    throw new Error(`depth cap exceeded (${canvasDepthLimit})`);
}

function checkPath(node: WireNode): void {
  if (node.type !== 'Canvas.Path') return;

  if (typeof node.props.d === 'string')
    validateNumericAttribute('d', node.props.d);
}

function isDrawing(type: string): boolean {
  return type.startsWith('Canvas.') && visualSchemas.has(type);
}
