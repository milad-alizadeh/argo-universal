import { listPartNames } from '@repo/contracts/plugins/kit';
import * as React from 'react';
import type { ElementProps } from './element-props';

export const listTypes = new Set<string>(listPartNames);

// Render callbacks run only in the worker; items and renderItem never become wire props.
export function expandList(type: string, props: ElementProps): ElementProps {
  if (!listTypes.has(type)) return props;

  if (!hasItems(props)) return props;

  return expanded(type, props);
}

function expanded(
  type: string,
  { items, renderItem, ...props }: ElementProps,
): ElementProps {
  if (!Array.isArray(items) || typeof renderItem !== 'function')
    throw new Error(`${type}: items and renderItem must be provided together`);

  return {
    ...props,
    children: items.map((item, index) => keyedRow(renderItem(item, index))),
  };
}

const hasItems = (props: ElementProps): boolean =>
  props.items !== undefined || props.renderItem !== undefined;

// Composite rows retain their outer identity across their rendered host descendants.
function keyedRow(row: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(row) || typeof row.type === 'string') return row;

  return wrappedRow(row);
}

function wrappedRow(row: React.ReactElement): React.ReactElement {
  return React.createElement(
    '#item',
    { argoKey: row.key ?? undefined, key: row.key },
    row,
  );
}
