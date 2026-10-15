import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { Sheet } from '#primitives/overlays/sheet';
import { Combobox } from './combobox';

export const changed = fn<(value: string) => void>();

export const blurred = fn<() => void>();

export const fruitTrigger = 'Fruit: Apple';

const choices = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Fig',
  'Grape',
  'Kiwi',
  'Lime',
].map((label) => ({ label, value: label }));

export function Choice(): React.JSX.Element {
  const [value, setValue] = useState('Apple');

  return (
    <Combobox
      label="Fruit"
      value={value}
      options={choices}
      onValueChange={(next) => {
        setValue(next);
        changed(next);
      }}
      onBlur={blurred}
      trigger={<Button custom label={`Fruit: ${value}`} />}
    />
  );
}

export function Form({
  protectable,
}: {
  protectable?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [dismissible, setDismissible] = useState(true);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      label="Settings"
      dismissible={dismissible}
      footer={
        protectable && (
          <Button
            label={dismissible ? 'Start sending' : 'Finish sending'}
            onPress={() => setDismissible(!dismissible)}
          />
        )
      }
      trigger={<Button custom label="Settings" />}
    >
      <Sheet.Page name="settings" title="Settings">
        <Choice />
      </Sheet.Page>
    </Sheet>
  );
}
