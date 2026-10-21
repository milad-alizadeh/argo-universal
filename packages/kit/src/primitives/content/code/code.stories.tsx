import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Code } from './index';

const sample =
  "// Responses must never be cached\nexport function noStore(res: Response) {\n  res.headers.set(CACHE, 'no-store');\n  return res;\n}";

const longSample = Array.from(
  { length: 30 },
  (_, index) =>
    `Line ${index + 1}: a long line of text that scrolls horizontally across the block.`,
).join('\n');

const meta = {
  title: 'Design System/Primitives/Content/Code',
  component: Code,
  argTypes: kitArgTypes('Code'),
  args: {
    code: sample,
    language: 'ts',
    path: 'src/http/middleware/no-store.ts',
  },
} satisfies Meta<typeof Code>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PathAndSyntax: Story = {};

export const NoPath: Story = {
  args: { code: 'echo ready', language: 'sh', path: undefined },
};

export const NoLanguage: Story = {
  args: { code: 'plain text', language: undefined, path: undefined },
};

export const Diff: Story = {
  args: {
    path: 'example.ts',
    code: undefined,
    language: undefined,
    diff: [
      {
        header: '@@ -1 +1 @@',
        lines: [
          { kind: 'removed', number: 1, text: 'const value = 1;' },
          { kind: 'added', number: 1, text: 'const value = 2;' },
        ],
      },
    ],
  },
};

export const Long: Story = {
  args: { code: longSample, language: undefined, path: undefined },
  parameters: {
    docs: {
      description: { story: 'Long lines scroll horizontally in the block.' },
    },
  },
};
