import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { Code } from './index';

const sample =
  "// Responses must never be cached\nexport function noStore(res: Response) {\n  res.headers.set(CACHE, 'no-store');\n  return res;\n}";

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

const props = meta.args;

const states = (
  <Variations>
    <Variation label="Path and syntax">
      <Code {...props} />
    </Variation>
    <Variation label="No path">
      <Code code="echo ready" language="sh" />
    </Variation>
    <Variation label="No language">
      <Code code="plain text" />
    </Variation>
    <Variation label="Diff">
      <Code
        path="example.ts"
        diff={[
          {
            header: '@@ -1 +1 @@',
            lines: [
              { kind: 'removed', number: 1, text: 'const value = 1;' },
              { kind: 'added', number: 1, text: 'const value = 2;' },
            ],
          },
        ]}
      />
    </Variation>
    <Variation label="Long">
      <Code
        code={Array.from(
          { length: 30 },
          (_, index) =>
            `Line ${index + 1}: a long line of text that scrolls horizontally across the block.`,
        ).join('\n')}
      />
    </Variation>
  </Variations>
);

export const States: Story = { name: 'Code', render: () => states };
