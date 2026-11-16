import { z } from 'zod';
import { defineKitComponent } from '../define-kit-component';
import { acknowledgedPayload } from '../kit-event-props';
import { metadataPickerProps } from '../metadata-props';

export const metadataPickerComponent = defineKitComponent(
  'An editable Metadata field: its children, one of the other fields, show the current value, and pressing them opens the choices in a popover, or a page on a phone.',
  metadataPickerProps,
  {
    group: 'scaffolds',
    children: [
      'Metadata.Label',
      'Metadata.Pills',
      'Metadata.StatusDot',
      'Metadata.Avatar',
    ],
    events: {
      // A single choice echoes the chosen value, as a Picker does.
      onValueChange: z.string().meta({ value: 'value', blocks: false }),
      onToggle: acknowledgedPayload(
        z.object({ value: z.string(), on: z.boolean() }),
      ),
      onCreate: acknowledgedPayload(z.string()),
    },
  },
);
