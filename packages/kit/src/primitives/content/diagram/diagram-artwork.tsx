import type { DiagramDrawing } from '@repo/contracts/kit-diagram';
import type * as React from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

// A tall diagram is scaled down to this height in the Feed; the full-screen view shows it at any size.
const diagramMaxHeight = 480;

// Fits the column, never larger than drawn, so a small diagram keeps its text size.
function frameStyle({ width, height }: DiagramDrawing): ViewStyle {
  return {
    width: '100%',
    maxWidth: width,
    maxHeight: diagramMaxHeight,
    aspectRatio: width / height,
    alignSelf: 'center',
  };
}

export function DiagramSvg({
  drawing,
}: {
  drawing: DiagramDrawing;
}): React.JSX.Element {
  return (
    <SvgXml
      accessible={false}
      xml={drawing.svg}
      width="100%"
      height="100%"
      onError={() => {}}
    />
  );
}

interface DiagramArtworkProps {
  drawing: DiagramDrawing;
  label: string;
  onOpen: () => void;
}

export function DiagramArtwork(props: DiagramArtworkProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint="Opens the diagram full screen"
      onPress={props.onOpen}
      style={frameStyle(props.drawing)}
      className="web:cursor-zoom-in"
    >
      <DiagramSvg drawing={props.drawing} />
    </Pressable>
  );
}
