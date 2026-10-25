import { z } from 'zod';
import { iconButtonPart } from './icon-button-part';
import { controlsPartSchemas as controls } from './parts/controls';
import { selectionPartSchemas } from './selection-parts';
import type { WirePartDefinition } from './wire-parts';

const slider = controls.Slider.props.extend({
  onValueChange: controls.Slider.props.shape.onValueChange.optional(),
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
  Slider: withDraft(controls.Slider, slider),
  SplitButton: withDraft(selectionPartSchemas.SplitButton, split),
  IconButton: iconButtonPart,
};
