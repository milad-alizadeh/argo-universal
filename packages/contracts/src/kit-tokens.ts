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
  'body-code',
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

// Expo UI's filled, outlined and text looks; danger is the text look in the danger colour.
export const buttonVariants = [
  'primary',
  'secondary',
  'text',
  'danger',
] as const;

export const buttonSizes = ['sm', 'md'] as const;

/*
 * Where a kit component's defaults are declared. A schema marks a prop with
 * `.meta({ default })` from these, so the props table reads it from the schema
 * and the component's styles apply the same value. Nothing is parsed or filled:
 * a Plugin that omits the prop still sends nothing.
 */
export const buttonDefaults = { variant: 'primary', size: 'md' } as const;

export const cardDefaults = { kind: 'card', density: 'regular' } as const;

export const iconButtonSizes = ['sm', 'md', 'lg'] as const;

export type IconButtonSize = (typeof iconButtonSizes)[number];

export const iconButtonDefaults = { variant: 'primary', size: 'md' } as const;

export const textDefaults = { role: 'body' } as const;

export const pillDefaults = {
  variant: 'label',
  appearance: 'plain',
  tone: 'muted',
} as const;

export const stackDefaults = { gap: 0, align: 'stretch' } as const;

export const scrollViewDefaults = { direction: 'vertical' } as const;

export const labelDefaults = { tone: 'muted' } as const;

export const progressBarDefaults = { tone: 'neutral' } as const;

export const avatarDefaults = { size: 'lg' } as const;

export const imageDefaults = { fit: 'cover', radius: 'none' } as const;

export const videoDefaults = {
  aspect: 'landscape',
  radius: 'control',
} as const;

export const sheetDefaults = { dismissible: true } as const;

export const svgDefaults = { tone: 'neutral' } as const;

export const statusDotDefaults = { size: 'md', pulse: false } as const;

export const datePickerDefaults = { mode: 'date' } as const;

export const menuDefaults = { align: 'end' } as const;

export const chartDefaults = { grid: false } as const;

// How wide a Screen's content runs on a window: the centred reading column, or the whole region.
export const screenWidths = ['content', 'full'] as const;

export type ScreenWidth = (typeof screenWidths)[number];

export const screenDefaults = { width: 'content' } as const;

export const listDefaults = {
  appearance: 'cards',
  density: 'regular',
  tileSize: 'md',
  aspect: 'landscape',
} as const;
