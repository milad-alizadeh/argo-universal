import { Text } from '@repo/client/text';
/*
 * Throwaway renderer feasibility check using Atlas masters 8G-0 / AU-0 / CZ-0.
 * This route has no Plugin registry or production API.
 */
import type { JSX } from 'react';
import { Diagnostics, Footer, Header } from './frame-details';
import { MapArea } from './frame-map';
import { main } from './frame-styles';
import type { Palette } from './model';
import { usePalette } from './palette';
import { usePrototypeState, type PrototypeState } from './prototype-state';

interface FrameProps {
  state: PrototypeState;
  palette: Palette;
}

function Frame({ state, palette }: FrameProps): JSX.Element {
  return (
    <main style={main(palette)}>
      <Header state={state} />
      <MapArea state={state} palette={palette} />
      <Footer state={state} />
      <Diagnostics palette={palette} />
    </main>
  );
}

export default function CodeMap834Prototype(): JSX.Element {
  const state = usePrototypeState();
  const palette = usePalette();

  if (!palette) return <Text>Measuring argo-universal</Text>;

  return <Frame state={state} palette={palette} />;
}
