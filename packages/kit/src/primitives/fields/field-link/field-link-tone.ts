import type { Tone } from '#primitives/content/text';
import type { FieldLinkRowProps } from './field-link-props';

export const linkLabel = (props: FieldLinkRowProps): string =>
  [props.title, props.subtitle, props.status?.label, props.value]
    .filter(Boolean)
    .join(', ');

// A destructive row's title is red; every other row keeps the title's own colour.
export const linkTone = (props: {
  destructive?: boolean;
  titleTone?: 'neutral' | 'muted';
}): Tone | undefined => (props.destructive ? 'danger' : props.titleTone);
