import { useState, type ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { Slider } from '#primitives/controls/slider';
import { Switch } from '#primitives/controls/switch';
import { FieldGroup } from '#primitives/fields/field-group';
import { Stack } from '#primitives/layout/stack';
import { Swatch } from '#primitives/visual/swatch';
import type { Light } from './field-composed-row-fixtures';

export type LightRowProps = {
  light: Light;
  onPower?: (on: boolean) => void;
  onBrightness?: (value: number) => void;
};

// A value the row holds itself, as a page would, and tells its caller of.
function useHeld<Value>(
  start: Value,
  onChange?: (value: NonNullable<Value>) => void,
): [Value, (value: NonNullable<Value>) => void] {
  const [held, setHeld] = useState(start);

  return [
    held,
    (next) => {
      setHeld(next);
      onChange?.(next);
    },
  ];
}

/*
 * The composed row of a light: a dot, its name over its detail and a switch, and under them its slider and value. A row
 * reads its children by type, so the pieces below are called, never rendered as components of their own.
 */
export function LightRow(props: LightRowProps): ReactElement {
  const [on, setOn] = useHeld(props.light.on, props.onPower);
  const [level, setLevel] = useHeld(props.light.brightness, props.onBrightness);

  return (
    <FieldGroup.Row>
      <Stack direction="column" gap={3}>
        {head(props.light, on, setOn)}
        {level === undefined ? null : brightness(props.light, level, setLevel)}
      </Stack>
    </FieldGroup.Row>
  );
}

function head(
  light: Light,
  on: boolean,
  setOn: (on: boolean) => void,
): ReactElement {
  return (
    <Stack direction="row" gap={3} align="center">
      {dot(light)}
      {names(light, on)}
      {power(light, on, setOn)}
    </Stack>
  );
}

const dot = (light: Light): ReactElement => (
  <Swatch colors={light.colors} accessibilityLabel={`${light.name} colour`} />
);

const power = (
  light: Light,
  on: boolean,
  setOn: (on: boolean) => void,
): ReactElement => (
  <Switch value={on} accessibilityLabel={light.name} onValueChange={setOn} />
);

function names(light: Light, on: boolean): ReactElement {
  return (
    <Stack direction="column">
      <Text role="row" tone={on ? undefined : 'muted'}>
        {light.name}
      </Text>
      <Text role="row-detail" tone="muted">
        {light.detail}
      </Text>
    </Stack>
  );
}

const percent = (value: number): string => `${value}%`;

const range = { minimumValue: 1, maximumValue: 100, step: 1 };

function brightness(
  light: Light,
  value: number,
  setValue: (value: number) => void,
): ReactElement {
  return (
    <Stack direction="row" gap={3} align="center">
      {slider(light, value, setValue)}
      <Text role="row-detail" tone="muted">
        {percent(value)}
      </Text>
    </Stack>
  );
}

const slider = (
  light: Light,
  value: number,
  setValue: (value: number) => void,
): ReactElement => (
  <Slider
    {...range}
    value={value}
    accessibilityLabel={`${light.name} brightness`}
    valueLabel={percent(value)}
    fill={light.colors}
    onValueChange={setValue}
  />
);
