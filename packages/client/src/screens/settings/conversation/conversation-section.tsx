import type {
  ConversationOptions,
  ConversationOptionsChange,
} from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { idleChoices } from './conversation-options';

export interface CallSectionProps {
  options: ConversationOptions;
  disabled: boolean;
  onChange: (change: ConversationOptionsChange) => void;
}

const fillerRow = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Toggle
    key="filler"
    title="Say a short line when handing work over"
    value={props.options.filler}
    disabled={props.disabled}
    onValueChange={(filler) => props.onChange({ filler })}
  />
);

const idleRow = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Picker
    key="idle"
    title="End a silent Conversation after"
    presentation="menu"
    value={String(props.options.idleSeconds)}
    options={idleChoices(props.options.idleSeconds)}
    disabled={props.disabled}
    onValueChange={(seconds) =>
      props.onChange({ idleSeconds: Number(seconds) })
    }
  />
);

/*
 * How every call behaves: the filler line and the idle timeout. Called, not rendered,
 * like the page's other sections.
 */
export const callSection = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Section
    key="conversation"
    title="During a Conversation"
    footer="These apply from the next Conversation."
  >
    {fillerRow(props)}
    {idleRow(props)}
  </FieldGroup.Section>
);
