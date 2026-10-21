import type { ReactElement } from 'react';
import { View } from 'react-native';
import { TileVisibility } from './tile-visibility';
import { useListVisibility } from './use-list-visibility';

const hiddenTiles: ReadonlySet<number> = new Set();

interface VisibilityProps {
  indices: ReadonlySet<number>;
  children: ReactElement;
}

export function TileViewportVisibility({
  indices,
  children,
}: VisibilityProps): ReactElement {
  const { visible, attach } = useListVisibility();

  return (
    <View ref={attach} collapsable={false} className="min-h-0 flex-1">
      <TileVisibility value={visible ? indices : hiddenTiles}>
        {children}
      </TileVisibility>
    </View>
  );
}
