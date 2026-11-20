import { useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { IconButton } from '#primitives/actions/icon-button';
import { litBars, meterBars } from './field-picker-meter-bars';
import type {
  FieldPickerAccessory,
  FieldPickerMeter,
} from './field-picker-model';

type RowEndProps = {
  accessory?: FieldPickerAccessory;
  meter?: FieldPickerMeter;
  children: ReactNode;
};

/*
 * A picker row that ends in its own button (ADR-0042, 2026-11-19): the trigger keeps the row's width and press, and the
 * glyph and the button sit after the value, outside it, so pressing the button never opens the picker.
 */
export function PickerRowEnd(props: RowEndProps): ReactNode {
  const ends = Boolean(props.accessory ?? props.meter);

  return ends ? <EndedRow {...props} /> : props.children;
}

// A row with a glyph keeps the button's lane when it has no button, so its glyph lines up with the next row's.
const EndedRow = (props: RowEndProps): ReactElement => (
  <View className="flex-row items-center gap-4">
    <View className="min-w-0 flex-1">{props.children}</View>
    {props.meter ? <LevelGlyph meter={props.meter} /> : null}
    <Accessory accessory={props.accessory} />
  </View>
);

function Accessory(props: { accessory?: FieldPickerAccessory }): ReactElement {
  const { accessory } = props;

  if (!accessory) return <View className="size-6" />;

  return (
    <IconButton
      icon={accessory.icon}
      size="sm"
      variant="secondary"
      accessibilityLabel={accessory.label}
      disabled={accessory.disabled}
      onPress={accessory.onPress}
    />
  );
}

// The bars lit, read again whenever the meter says its level moved; a level that lights as many bars draws nothing new.
const useLitBars = (meter: FieldPickerMeter): number =>
  useSyncExternalStore(meter.subscribe, () => litBars(meter.level()));

// Eight bars, lit from the left as far as the level reaches; it says nothing a screen reader needs.
function LevelGlyph(props: { meter: FieldPickerMeter }): ReactElement {
  const lit = useLitBars(props.meter);

  return (
    <View
      testID="field-picker-meter"
      aria-hidden
      className="w-9.5 shrink-0 flex-row items-center gap-0.5"
    >
      {meterBars.map((bar) => (
        <Bar key={bar} lit={bar < lit} />
      ))}
    </View>
  );
}

const Bar = (props: { lit: boolean }): ReactElement => (
  <View
    testID={props.lit ? 'field-picker-meter-lit' : 'field-picker-meter-unlit'}
    className={cn(
      'h-3 w-0.75 rounded-full',
      props.lit ? 'bg-success' : 'bg-border',
    )}
  />
);
