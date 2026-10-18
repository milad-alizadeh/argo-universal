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

export const stackGaps = {
  gap0: 0,
  gap1: 1,
  gap2: 2,
  gap3: 3,
  gap4: 4,
  gap5: 5,
  gap6: 6,
  gap8: 8,
  gap10: 10,
  gap12: 12,
} as const;

export type StackGap = (typeof stackGaps)[keyof typeof stackGaps];

export const isStackGap = (value: number): value is StackGap =>
  Object.values(stackGaps).some((gap) => gap === value);

export const stackAlignments = ['start', 'center', 'end', 'stretch'] as const;

export const buttonVariants = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const;

export const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const;
