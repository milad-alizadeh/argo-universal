import type { Styles } from './snapshot-model.mts';

// How a copy's root sits in its parent: the copy may set these freely.
const PLACEMENT = new Set([
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'order',
  'alignSelf',
  'justifySelf',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gridRowStart',
  'gridRowEnd',
  'gridColumnStart',
  'gridColumnEnd',
]);

export interface StyleChange {
  property: string;
  master: string | undefined;
  copy: string | undefined;
  // Both resolve to one value through different tokens, or a token and a literal.
  sameValue?: boolean;
}

// Placement applies to a copy's root; hiding is `display: none` on either side.
export interface Allowances {
  placement: boolean;
  hiding: boolean;
}

export const strict: Allowances = { placement: false, hiding: false };

function valueOf(styles: Styles, property: string): string | undefined {
  const value = styles[property];
  return value === undefined ? undefined : String(value);
}

function isHiding(change: StyleChange): boolean {
  return (
    change.property === 'display' &&
    (change.master === 'none' || change.copy === 'none')
  );
}

function isAllowedPlacement(change: StyleChange, allow: Allowances): boolean {
  return allow.placement && PLACEMENT.has(change.property);
}

function isAllowed(change: StyleChange, allow: Allowances): boolean {
  return (
    isAllowedPlacement(change, allow) || (allow.hiding && isHiding(change))
  );
}

export function isPlacement(property: string): boolean {
  return PLACEMENT.has(property);
}

function changeOf(master: Styles, copy: Styles, property: string): StyleChange {
  return {
    property,
    master: valueOf(master, property),
    copy: valueOf(copy, property),
  };
}

export function diffStyles(
  master: Styles,
  copy: Styles,
  allow: Allowances,
): StyleChange[] {
  const properties = new Set([...Object.keys(master), ...Object.keys(copy)]);
  return [...properties]
    .sort()
    .map((property): StyleChange => changeOf(master, copy, property))
    .filter(
      (change): boolean =>
        change.master !== change.copy && !isAllowed(change, allow),
    );
}
