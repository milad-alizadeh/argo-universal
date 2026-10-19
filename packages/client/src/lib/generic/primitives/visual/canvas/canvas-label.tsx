import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { rectCorners } from './canvas-geometry';
import type { LabelProps } from './canvas-label-props';
import { matrixPoint, rotationMatrix } from './canvas-matrix';
import { MeasuredText } from './canvas-measured-text';
import type { TextMeasurement } from './canvas-measured-text-props';
import type { Bounds } from './canvas-props';
import { unionBounds } from './canvas-scene-types';

const unmeasured: TextMeasurement = { width: 0, height: 0, singleLine: false };

interface LabelVisual extends LabelProps {
  visible: boolean;
  onMeasure: (next: TextMeasurement) => void;
}

function textBounds(angle: number, measurement: TextMeasurement): Bounds {
  const matrix = rotationMatrix(angle, { x: 0, y: 0 });

  const bounds = rectCorners(measurement).map((point) => ({
    ...matrixPoint(point, matrix),
    width: 0,
    height: 0,
  }));

  return unionBounds(bounds);
}

function useHitBounds(
  props: LabelProps,
  measurement: TextMeasurement,
  visible: boolean,
): void {
  const { entry, onBounds, angle } = props;
  const address = entry.address;

  const bounds = useMemo(
    () => (visible ? textBounds(angle, measurement) : undefined),
    [visible, angle, measurement],
  );

  useLayoutEffect(() => onBounds(address, bounds), [address, onBounds, bounds]);
  useLayoutEffect(() => (): void => onBounds(address), [address, onBounds]);
}

export function CanvasLabel(props: LabelProps): React.JSX.Element | null {
  const [measurement, set] = useState(unmeasured);

  const onMeasure = useCallback((next: TextMeasurement): void => {
    set((previous) => (sameMeasurement(previous, next) ? previous : next));
  }, []);

  const visible =
    measurement.singleLine && measurement.height <= props.box.height;

  useHitBounds(props, measurement, visible);

  return labelElement({ ...props, onMeasure, visible });
}

function labelStyle({ box, angle }: LabelProps): ViewStyle {
  return {
    position: 'absolute',
    left: box.x,
    top: box.y,
    width: box.width,
    transformOrigin: 'top left',
    transform: [{ rotate: `${angle}rad` }],
  };
}

function labelElement(props: LabelVisual): React.JSX.Element | null {
  const { entry, onMeasure, visible } = props;

  if (entry.drawing.kind !== 'text') return null;

  const text = {
    text: entry.drawing.props.text,
    color: entry.color,
    visible,
    onMeasure,
  };

  return (
    <View accessible={false} style={labelStyle(props)}>
      <MeasuredText {...text} />
    </View>
  );
}

function sameMeasurement(a: TextMeasurement, b: TextMeasurement): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.singleLine === b.singleLine
  );
}
