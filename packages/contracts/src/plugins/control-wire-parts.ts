import { z } from 'zod';
import { iconButtonPart } from './icon-button-part';
import { inputsPartSchemas as inputs } from './parts/inputs';
import { selectionPartSchemas } from './selection-parts';
import type { WirePartDefinition } from './wire-parts';

const picker = inputs.Picker.props.extend({
  onValueChange: inputs.Picker.props.shape.onValueChange.optional(),
});

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

const splitChoices = selectionPartSchemas.SplitButton.props.options[0];

const split = z.union([
  splitChoices.extend({
    onValueChange: splitChoices.shape.onValueChange.optional(),
  }),
  selectionPartSchemas.SplitButton.props.options[1],
]);

type UpdatedPart<Part, Schema> = Omit<Part, 'props' | 'versions'> & {
  props: Schema;
  versions: readonly z.ZodType[];
};

function withDraft<Part extends WirePartDefinition, Schema extends z.ZodType>(
  part: Part,
  props: Schema,
): UpdatedPart<Part, Schema> {
  return { ...part, props, versions: [...part.versions, props] };
}

export const controlWireParts = {
  Picker: withDraft(inputs.Picker, picker),
  Switch: withDraft(inputs.Switch, toggle),
  Checkbox: withDraft(inputs.Checkbox, checkbox),
  Slider: withDraft(inputs.Slider, slider),
  TextInput: withDraft(inputs.TextInput, text),
  SplitButton: withDraft(selectionPartSchemas.SplitButton, split),
  IconButton: iconButtonPart,
};
