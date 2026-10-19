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

// The spacing scale every gap and padding prop takes: a step of `--spacing-*` in theme.css.
export const spacingSteps = {
  space0: 0,
  space1: 1,
  space2: 2,
  space3: 3,
  space4: 4,
  space5: 5,
  space6: 6,
  space8: 8,
  space10: 10,
  space12: 12,
} as const;

export type SpacingStep = (typeof spacingSteps)[keyof typeof spacingSteps];

export const stackAlignments = ['start', 'center', 'end', 'stretch'] as const;

export const buttonVariants = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const;

export const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const;
