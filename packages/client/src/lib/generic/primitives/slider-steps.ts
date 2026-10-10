export interface SliderRange {
  minimumValue: number;
  maximumValue: number;
  step: number;
}

export function sliderStops(range: SliderRange): number[] {
  const length = sliderStopCount(range);
  return Array.from(
    { length },
    (_, index) => range.minimumValue + index * range.step,
  );
}

export function sliderStopCount(range: SliderRange): number {
  return Math.round((range.maximumValue - range.minimumValue) / range.step) + 1;
}
