export const src = 'packages/client/src';

export const kit = 'packages/kit/src';

export const svgTitle = 'Design System/Primitives/Visual/Svg';

export const meta = (title: string): string =>
  `export const meta = {\n  title: '${title}',\n} satisfies Meta;`;

// A file draws an aspect of its folder only when its meta draws the folder's own component.
export const drawing = (title: string, component: string): string =>
  `export const meta = {\n  title: '${title}',\n  component: ${component},\n} satisfies Meta;`;
