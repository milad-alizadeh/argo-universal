export const tones = [
  'neutral',
  'muted',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'done',
] as const;

export const textRoles = [
  'title',
  'heading',
  'body',
  'secondary',
  'secondary-code',
  'control',
  'badge',
  'code',
  'nav-title',
  'nav-action',
  'row',
  'row-detail',
] as const;

const stackGapTokens = {
  0: true,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  8: true,
  10: true,
  12: true,
} as const;

export type StackGap = keyof typeof stackGapTokens;

export const isStackGap = (value: number): value is StackGap =>
  Object.hasOwn(stackGapTokens, value);

export const stackAlignments = ['start', 'center', 'end', 'stretch'] as const;

export const buttonVariants = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const;

export const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const;
