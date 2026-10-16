import * as React from 'react';

const rejected = ['className', 'style'] as const;

// The kit components that take their visible text as children.
const textual = new Set(['Text', 'Button']);

function labelOf(children: unknown): string {
  return [children]
    .flat()
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
}

// Element props such as `leading` become children of a `#slot` node, which the wire carries as a named slot.
function prepare(
  type: string,
  props: Record<string, unknown>,
  key: string | undefined,
): Record<string, unknown> {
  for (const name of rejected)
    if (name in props)
      throw new Error(`${type}: ${name} is not allowed on Plugin components`);
  const { children, ...rest } = props;
  const prepared: Record<string, unknown> = { argoKey: key };
  const slots: React.ReactNode[] = [];

  for (const [name, value] of Object.entries(rest))
    if (React.isValidElement(value))
      slots.push(React.createElement('#slot', { name, key: name }, value));
    else prepared[name] = value;

  if (textual.has(type) && children !== undefined)
    prepared.label = labelOf(children);

  return {
    ...prepared,
    children: textual.has(type) ? slots : [children, slots].flat(),
  };
}

function create(
  type: React.ElementType,
  props: Record<string, unknown>,
  key: string | undefined,
): React.ReactElement {
  if (typeof type !== 'string') return React.createElement(type, { ...props, key });

  return React.createElement(type, prepare(type, props, key));
}

export const jsx = create;

export const jsxs = create;
