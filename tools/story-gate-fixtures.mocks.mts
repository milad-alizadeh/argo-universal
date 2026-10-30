export const kit =
  'packages/kit/src/primitives/actions/button/button.stories.tsx';

export const meta = (body: string): string =>
  `export const meta = {\n  title: 'Design System/Primitives/Actions/Button',\n${body}\n} satisfies Meta<typeof Button>;\n\nexport default meta;\n`;

export const drawing = meta(
  "  component: Button,\n  argTypes: kitArgTypes('Button'),",
);
