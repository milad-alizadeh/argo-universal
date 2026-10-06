import { View } from 'react-native';

export interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
  valueLabel: string;
  disabled?: boolean;
}

export function Slider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  accessibilityLabel,
  valueLabel,
  disabled,
}: SliderProps) {
  const progress =
    ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  const steps = Math.round((maximumValue - minimumValue) / step) + 1;
  return (
    <View className="relative h-4 justify-center">
      <input
        type="range"
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={accessibilityLabel}
        aria-valuetext={valueLabel}
        onChange={(event) => onValueChange(Number(event.currentTarget.value))}
        className="m-0 h-1 w-full appearance-none rounded-full cursor-pointer disabled:opacity-50 focus-visible:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-muted) ${progress}%)`,
        }}
      />
      <View
        pointerEvents="none"
        className="absolute left-1.5 right-1.5 flex-row justify-between"
      >
        {Array.from({ length: steps }, (_, index) => (
          <View
            key={index}
            className={
              minimumValue + index * step < value
                ? 'size-1 rounded-full bg-primary-foreground'
                : 'size-1 rounded-full bg-ring'
            }
            style={{ opacity: minimumValue + index * step === value ? 0 : 1 }}
          />
        ))}
      </View>
    </View>
  );
}
