import type { ReactElement } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { MenuTrigger } from '#primitives/overlays/menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { ControlledPicker } from './field-picker-controlled';
import { screenMultiple, screenWithButton } from './field-picker-fixtures';

type Props = { onValueChange: (value: string | readonly string[]) => void };

// A Configure-like popover: a FieldGroup of a plain row, a single-choice page picker and a multiple one.
export function PopoverFieldGroup(props: Props): ReactElement {
  return (
    <Popover>
      <PopoverTrigger>
        <MenuTrigger label="Configure" />
      </PopoverTrigger>
      <PopoverContent accessibilityLabel="Configure" className="p-0">
        <Rows {...props} />
      </PopoverContent>
    </Popover>
  );
}

function Rows(props: Props): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value title="Agent" value="Claude" />
        {pickers(props)}
      </FieldGroup.Section>
      <FieldGroup.Section>
        <FieldGroup.Value title="Mode" value="Code" />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

const pickers = (props: Props): ReactElement[] => [
  <ControlledPicker
    key="model"
    {...screenWithButton}
    title="Model"
    onValueChange={props.onValueChange}
  />,
  <ControlledPicker
    key="tags"
    {...screenMultiple}
    title="Tags"
    onValueChange={props.onValueChange}
  />,
];
