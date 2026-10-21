import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import {
  diffCode,
  longCode,
  noLanguageCode,
  noPathCode,
  pathAndSyntaxCode,
} from './code-fixtures';
import { Code } from './index';

const meta = {
  title: 'Design System/Primitives/Content/Code',
  component: Code,
  argTypes: kitArgTypes('Code'),
} satisfies Meta<typeof Code>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PathAndSyntax: Story = { args: pathAndSyntaxCode };

export const NoPath: Story = { args: noPathCode };

export const NoLanguage: Story = { args: noLanguageCode };

export const Diff: Story = { args: diffCode };

export const Long: Story = {
  args: longCode,
  parameters: {
    docs: {
      description: { story: 'Long lines scroll horizontally in the block.' },
    },
  },
};
