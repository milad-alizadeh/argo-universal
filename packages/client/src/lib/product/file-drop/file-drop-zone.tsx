import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

const outlineWidth = 2;

// The outline's dashes and gaps; CSS dashed borders can't set their length, so the outline is an SVG stroke.
const outlineDashes = '10 8';

interface Size {
  width: number;
  height: number;
}

const sizeOf = ({ nativeEvent }: LayoutChangeEvent): Size => ({
  width: nativeEvent.layout.width,
  height: nativeEvent.layout.height,
});

const inset = outlineWidth / 2;

const strokeProps = {
  x: inset,
  y: inset,
  fill: 'none',
  strokeWidth: outlineWidth,
  strokeLinecap: 'round',
  strokeDasharray: outlineDashes,
} as const;

// The zone's corners, which its dashed outline follows.
const zoneRadius = 'rounded-2xl';

// The radius in points: the web resolves it as "18px", native as 18.
function useZoneRadius(): number {
  const { borderTopLeftRadius: radius } = useResolveClassNames(zoneRadius);

  return typeof radius === 'string'
    ? Number.parseFloat(radius)
    : Number(radius);
}

// The stroke runs inside the zone's edge, so its corners follow the zone's radius less half the stroke.
function DashedOutline({ width, height }: Size): React.JSX.Element {
  const { color } = useResolveClassNames('text-focus');
  const radius = useZoneRadius() - inset;

  return (
    <Svg width={width} height={height}>
      <Rect
        {...strokeProps}
        width={width - outlineWidth}
        height={height - outlineWidth}
        rx={radius}
        stroke={color}
      />
    </Svg>
  );
}

// Where dragged files land: the whole pane below the Session header, tinted and outlined, behind the Feed.
export function FileDropZone(): React.JSX.Element {
  const [size, setSize] = useState<Size>();

  return (
    <View
      className={`pointer-events-none absolute inset-2 bg-hover ${zoneRadius}`}
      onLayout={(event) => setSize(sizeOf(event))}
    >
      {size && <DashedOutline {...size} />}
    </View>
  );
}

// Centred over the Feed, which fades so the label reads.
export function FileDropLabel(): React.JSX.Element {
  return (
    <View className="pointer-events-none absolute inset-0 items-center justify-center">
      <View className="rounded-full shadow-control">
        <View className="flex-row items-center gap-1.5 rounded-full bg-card px-3.5 py-2 shadow-hairline">
          <Icon name="attach" />
          <Text role="body">Drop files to attach</Text>
        </View>
      </View>
    </View>
  );
}
