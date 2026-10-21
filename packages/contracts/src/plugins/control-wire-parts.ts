import { z } from 'zod';
import { iconButtonPart } from './icon-button-part';
import { fieldsPartSchemas } from './parts/fields';
import { inputsPartSchemas as inputs } from './parts/inputs';
import { selectionPartSchemas } from './selection-parts';
import type { WirePartDefinition } from './wire-parts';

const [onePick, manyPicks] = inputs.Picker.props.options;

const onePickDraft = onePick.extend({
  onValueChange: onePick.shape.onValueChange.optional(),
});

const picker = z.union([
  onePickDraft,
  manyPicks.extend({ onValueChange: manyPicks.shape.onValueChange.optional() }),
]);

const toggle = inputs.Switch.props.extend({
  onValueChange: inputs.Switch.props.shape.onValueChange.optional(),
});

const checkbox = inputs.Checkbox.props.extend({
  onValueChange: inputs.Checkbox.props.shape.onValueChange.optional(),
});

const slider = inputs.Slider.props.extend({
  onValueChange: inputs.Slider.props.shape.onValueChange.optional(),
});

const text = inputs.TextInput.props.extend({
  onChangeText: inputs.TextInput.props.shape.onChangeText.optional(),
});

const datePicker = inputs.DatePicker.props.extend({
  onValueChange: inputs.DatePicker.props.shape.onValueChange.optional(),
});

const splitChoices = selectionPartSchemas.SplitButton.props.options[0];

const split = z.union([
  splitChoices.extend({
    onValueChange: splitChoices.shape.onValueChange.optional(),
  }),
  selectionPartSchemas.SplitButton.props.options[1],
]);

type UpdatedPart<Part, Schema> = Omit<Part, 'props'> & {
  props: Schema;
};

function withDraft<Part extends WirePartDefinition, Schema extends z.ZodType>(
  part: Part,
  props: Schema,
): UpdatedPart<Part, Schema> {
  return { ...part, props };
}

export const controlWireParts = {
  Picker: withDraft(inputs.Picker, picker),
  Switch: withDraft(inputs.Switch, toggle),
  Checkbox: withDraft(inputs.Checkbox, checkbox),
  Slider: withDraft(inputs.Slider, slider),
  TextInput: withDraft(inputs.TextInput, text),
  DatePicker: withDraft(inputs.DatePicker, datePicker),
  Form: fieldsPartSchemas.Form,
  SplitButton: withDraft(selectionPartSchemas.SplitButton, split),
  IconButton: iconButtonPart,
};
