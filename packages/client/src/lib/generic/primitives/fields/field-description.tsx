import {
  createElement,
  useId,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { Text } from '../display/text/text';
import { errorMessage, type FieldErrors } from './field-errors';
import { useFooterDescription } from './field-footer';

export type DescribedField = {
  errors?: FieldErrors;
  invalid?: boolean;
  hint?: string;
};
export type FieldDescription = {
  invalid: boolean;
  description?: string;
  descriptionId?: string;
  footerId: string;
  footer?: string;
};

export function useFieldDescription(props: DescribedField): FieldDescription {
  const message = fieldMessage(props);
  const footerId = useId();
  const inherited = useFooterDescription({
    invalid: message.invalid,
    hint: props.hint,
  });
  return {
    ...message,
    footerId,
    descriptionId: inherited ?? ownDescription(footerId, message.description),
    footer: inherited ? undefined : message.description,
  };
}

function fieldMessage(
  props: DescribedField,
): Pick<FieldDescription, 'invalid' | 'description'> {
  const error = errorMessage(props.errors ?? []);
  return {
    invalid: fieldInvalid(props.invalid, error),
    description: error ?? props.hint,
  };
}

function ownDescription(id: string, text?: string): string | undefined {
  return text ? id : undefined;
}

type FooterProps = Pick<FieldDescription, 'footerId' | 'invalid' | 'footer'>;
export function FieldDescriptionFooter(
  props: FooterProps,
): ReactElement | null {
  return props.footer
    ? createElement(Text, footerProps(props), props.footer)
    : null;
}

function footerProps(props: FooterProps): ComponentProps<typeof Text> {
  return {
    id: props.footerId,
    role: 'secondary',
    semanticRole: props.invalid ? 'alert' : undefined,
    className: props.invalid ? 'text-destructive' : 'text-muted-foreground',
  };
}

function fieldInvalid(invalid?: boolean, error?: string): boolean {
  return invalid === true || error !== undefined;
}
