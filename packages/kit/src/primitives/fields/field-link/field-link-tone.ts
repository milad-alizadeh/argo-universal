import type { Tone } from '#primitives/content/text';

// A destructive row's title is red; every other row keeps the title's own colour.
export const linkTone = (props: {
  destructive?: boolean;
  titleTone?: 'neutral' | 'muted';
}): Tone | undefined => (props.destructive ? 'danger' : props.titleTone);
