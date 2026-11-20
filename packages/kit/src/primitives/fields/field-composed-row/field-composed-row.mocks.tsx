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

// The composed row of a light: a dot, its name over its detail and a switch, and under them its slider and value.
export function LightRow(props: LightRowProps): ReactElement {
  const { light } = props;
  const [on, setOn] = useState(light.on);
  const [brightness, setBrightness] = useState(light.brightness);
  const tone = on ? undefined : 'muted';

  return (
    <FieldGroup.Row>
      <Stack direction="column" gap={3}>
        <Stack direction="row" gap={3} align="center">
          <Swatch
            colors={light.colors}
            accessibilityLabel={`${light.name} colour`}
          />
          <Stack direction="column">
            <Text role="row" tone={tone}>
              {light.name}
            </Text>
            <Text role="row-detail" tone="muted">
              {light.detail}
            </Text>
          </Stack>
          <Switch
            value={on}
            accessibilityLabel={light.name}
            onValueChange={(next) => {
              setOn(next);
              props.onPower?.(next);
            }}
          />
        </Stack>
        {brightness === undefined || light.colors === undefined ? null : (
          <Stack direction="row" gap={3} align="center">
            <Slider
              value={brightness}
              minimumValue={1}
              maximumValue={100}
              step={1}
              accessibilityLabel={`${light.name} brightness`}
              valueLabel={`${brightness}%`}
              fill={light.colors}
              onValueChange={(next) => {
                setBrightness(next);
                props.onBrightness?.(next);
              }}
            />
            <Text role="row-detail" tone="muted">{`${brightness}%`}</Text>
          </Stack>
        )}
      </Stack>
    </FieldGroup.Row>
  );
}
