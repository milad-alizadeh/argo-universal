import { useRef, type JSX, type RefObject } from 'react';
import { useFlatContext } from './flat-context';
import { useFlatLabels } from './flat-labels';
import { useFlatPan } from './flat-pan';
import { useFlatPicture } from './flat-picture';
import { useFlatPointer } from './flat-pointer';
import { FlatRaster, type FlatDrawing } from './flat-raster';
import { useFlatWheel } from './flat-wheel';
import type { MapProps } from './model';

function useDrawing(
  props: MapProps,
  host: RefObject<HTMLDivElement | null>,
): FlatDrawing {
  const ctx = useFlatContext(props, host);
  const picture = useFlatPicture(ctx);
  useFlatPointer(ctx);
  useFlatPan(ctx);
  useFlatLabels(ctx);
  useFlatWheel(ctx);

  return { ctx, picture };
}

export default function FlatMap(props: MapProps): JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);
  const drawing = useDrawing(props, host);

  return (
    <div
      ref={host}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <FlatRaster {...drawing} />
    </div>
  );
}
