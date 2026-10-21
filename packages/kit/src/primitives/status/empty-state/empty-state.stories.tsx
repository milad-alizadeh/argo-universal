import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { EmptyState } from './empty-state';
import {
  defaultEmptyState,
  iconAndDescriptionEmptyState,
  noActionEmptyState,
  searchEmptyState,
  titleOnlyEmptyState,
} from './empty-state-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/EmptyState',
  component: EmptyState,
  argTypes: kitArgTypes('EmptyState'),
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultEmptyState };

export const NoAction: Story = { args: noActionEmptyState };

export const TitleOnly: Story = { args: titleOnlyEmptyState };

export const Search: Story = { args: searchEmptyState };

export const IconAndDescription: Story = {
  args: iconAndDescriptionEmptyState,
};
