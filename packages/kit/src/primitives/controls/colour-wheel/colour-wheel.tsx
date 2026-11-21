import { useState, type ReactElement } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import type { KitProps } from '../../kit-props';
import { useWheelInput } from './wheel-input';
import wheel from './wheel.png';

type Props = KitProps<'ColourWheel'>;

type Colour = NonNullable<Props['value']>;

const size = 200;

const radius = size / 2;

const fullTurn = 360;

const fullSaturation = 100;

const quarterTurn = 90;

const radians = Math.PI / (fullTurn / 2);

const accessibleStep = 5;

function colourAt(rawX: number, rawY: number): Colour {
  const x = rawX - radius;
  const y = rawY - radius;
  const degrees = Math.atan2(y, x) / radians + quarterTurn;

  return {
    hue: (Math.round(degrees) + fullTurn) % fullTurn,
    saturation: Math.min(
      fullSaturation,
      Math.round((Math.hypot(x, y) / radius) * fullSaturation),
    ),
  };
}

function position({ hue, saturation }: Colour): ViewStyle {
  const angle = (hue - quarterTurn) * radians;
  const distance = (radius * saturation) / fullSaturation;

  return {
    left: radius + Math.cos(angle) * distance,
    top: radius + Math.sin(angle) * distance,
  };
}

export function ColourWheel(props: Props): ReactElement {
  const [local, setLocal] = useState<Colour>();
  const value = props.value ?? local;

  const description = value
    ? `${value.hue}°, ${value.saturation}%`
    : 'No colour selected';

  const pick = (colour: Colour): void => {
    setLocal(colour);
    props.onValueChange?.(colour);
  };

  const input = useWheelInput(props.disabled ?? false, (x, y) =>
    pick(colourAt(x, y)),
  );

  return (
    <View
      className="relative self-center web:touch-none"
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: props.disabled }}
      accessibilityValue={{ text: description }}
      aria-valuetext={description}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (props.disabled) return;

        const step =
          nativeEvent.actionName === 'increment'
            ? accessibleStep
            : -accessibleStep;

        pick({
          hue: ((value?.hue ?? 0) + step + fullTurn) % fullTurn,
          saturation: value?.saturation ?? fullSaturation,
        });
      }}
      {...input}
    >
      <WheelArt value={value} />
    </View>
  );
}

function WheelArt({ value }: { value: Colour | undefined }): ReactElement {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Image
        source={typeof wheel === 'string' ? { uri: wheel } : wheel}
        style={{ width: size, height: size }}
      />
      {value && (
        <View
          className="absolute size-5 -translate-x-2.5 -translate-y-2.5 rounded-full border-2 border-foreground bg-card/20"
          style={position(value)}
        />
      )}
    </View>
  );
}
