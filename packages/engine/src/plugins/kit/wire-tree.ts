import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotParentKey,
} from '@repo/contracts/plugins/wire-node-key';
import { listTypes } from './list-props';
import { childKeys } from './wire-keys';

export type Prop = WireJson;

export type Props = Record<string, Prop>;

// A node a Render drew; `#slot` children are filled into the parent's named slots.
export interface Instance {
  type: string;
  key?: string;
  props: Props;
  children: Instance[];
}

const slotType = '#slot';

function checkChildren(instance: Instance, children: Instance[]): void {
  if (needsKeys(instance, children))
    throw new Error(`${instance.type}: every list child needs a key`);
  checkUniqueKeys(instance.type, children);
}

function checkUniqueKeys(type: string, children: Instance[]): void {
  const seen = new Set<string>();

  for (const key of childKeys(children)) {
    if (seen.has(key)) throw new Error(`${type}: duplicate child key ${key}`);
    seen.add(key);
  }
}

const isSlot = (instance: Instance): boolean => instance.type === slotType;

function slotContent(slot: Instance, id: string): [string, WireNode[]][] {
  if (!slot.key) return [];
  checkChildren(slot, slot.children);

  const content = wireChildren(slot.children, slotParentKey(id, slot.key));

  return content.length ? [[slot.key, content]] : [];
}

function wireSlots(instance: Instance, id: string): WireNode['slots'] {
  return Object.fromEntries(
    instance.children.filter(isSlot).flatMap((slot) => slotContent(slot, id)),
  );
}

function wireNode(source: Instance, id: string): WireNode {
  const instance = rowContent(source);
  const content = instance.children.filter((child) => !isSlot(child));
  checkChildren(instance, content);

  return {
    type: instance.type,
    key: decodeURIComponent(id.slice(id.lastIndexOf('/') + 1)),
    props: instance.props,
    children: wireChildren(content, id),
    slots: wireSlots(instance, id),
  };
}

function wireChildren(instances: Instance[], parent: string): WireNode[] {
  const keys = childKeys(instances);

  return instances.map((instance, index) =>
    wireNode(instance, childNodeKey(parent, keys[index] ?? String(index))),
  );
}

// Turns a Render's instances into wire nodes.
export function toWire(root: Instance): WireNode {
  const [node] = wireChildren([root], '');

  if (!node) throw new Error('A page must render one component');

  return node;
}

const needsKeys = (instance: Instance, children: Instance[]): boolean =>
  keyedContainer(instance.type) &&
  children.some((child) => child.key === undefined);

// A composite list row is one keyed item, including when a Fragment supplies several nodes.
function rowContent(instance: Instance): Instance {
  if (instance.type !== '#item') return instance;

  const [only] = instance.children;

  if (instance.children.length === 1) return singleRow(only, instance);

  return {
    ...instance,
    type: 'Stack',
    props: { ...instance.props, direction: 'column' },
  };
}

const singleRow = (only: Instance | undefined, fallback: Instance): Instance =>
  only ?? fallback;

const keyedContainer = (type: string): boolean =>
  listTypes.has(type) || type === 'Canvas' || type === 'Canvas.Group';
