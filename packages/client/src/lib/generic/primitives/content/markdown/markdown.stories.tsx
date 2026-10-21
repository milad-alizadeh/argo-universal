import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../variations';
import { Markdown } from './index';

const meta = {
  title: 'Design System/Primitives/Markdown',
  component: Markdown,
  args: { text: '' },
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const states = (
  <Variations>
    <Variation label="Headings">
      <Markdown
        text={
          '# Overview\n\nA short introduction.\n\n## Details\n\nMore information.\n\n### Notes'
        }
      />
    </Variation>
    <Variation label="Lists">
      <Markdown
        text={'A paragraph.\n\n3. Third item\n4. Fourth item\n   - Nested item'}
      />
    </Variation>
    <Variation label="Inline">
      <Markdown
        text={
          '**Bold**, *italic*, ~~removed~~, `value`, and [a page](https://example.com).'
        }
      />
    </Variation>
    <Variation label="Quote and break">
      <Markdown text={'> A quoted note.\n\n---\n\nThe next paragraph.'} />
    </Variation>
    <Variation label="Code">
      <Markdown text={'```ts\nconst value = 42;\n```'} />
    </Variation>
    <Variation label="Table">
      <Markdown text={'| Name | Value |\n| --- | --- |\n| Size | Small |'} />
    </Variation>
    <Variation label="Streaming">
      <Markdown text="Text arriving" streaming />
    </Variation>
  </Variations>
);

export const States: Story = { name: 'Markdown', render: () => states };
