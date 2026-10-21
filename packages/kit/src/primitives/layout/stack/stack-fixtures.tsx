import { Text } from '#primitives/content/text';
import type { StackProps } from './stack-props';

const children = (
  <>
    <Text>One</Text>
    <Text>Two</Text>
  </>
);

export const rowStack = {
  direction: 'row',
  gap: 4,
  children,
} satisfies StackProps;

export const columnStack = {
  direction: 'column',
  gap: 2,
  align: 'start',
  children,
} satisfies StackProps;
