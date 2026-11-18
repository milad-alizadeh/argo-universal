import {
  Canvas,
  FilterMode,
  Image,
  MipmapMode,
  type SkImage,
} from '@shopify/react-native-skia';
import type * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';

// Scaled up smoothly, as a browser scales the original's canvas.
const sampling = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

interface OrbCanvasProps {
  image: SharedValue<SkImage | null>;
  pixels: number;
}

// Shows an orb's image, which its loop redraws on the UI thread.
export function OrbCanvas(props: OrbCanvasProps): React.JSX.Element {
  const { image, pixels } = props;
  const style = { width: pixels, height: pixels };

  return (
    <Canvas style={style}>
      <Image image={image} {...style} fit="fill" sampling={sampling} />
    </Canvas>
  );
}
