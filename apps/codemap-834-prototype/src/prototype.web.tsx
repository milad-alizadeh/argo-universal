import { Text } from '@repo/client/text';
/*
 * Throwaway renderer feasibility check using Atlas masters 8G-0 / AU-0 / CZ-0.
 * This route has no Plugin registry or production API.
 */
import type { JSX } from 'react';
import type { Palette } from './model';
import { usePalette } from './palette';
import { usePrototypeState, type PrototypeState } from './prototype-state';
import { Diagnostics, FileSelector, Footer, Header } from './shell-details';
import { MapArea } from './shell-map';
import { main } from './shell-styles';

interface ShellProps {
  state: PrototypeState;
  palette: Palette;
}

function Shell({ state, palette }: ShellProps): JSX.Element {
  return (
    <main style={main(palette)}>
      <Header state={state} />
      <MapArea state={state} palette={palette} />
      <Footer state={state} />
      <FileSelector state={state} />
      <Diagnostics state={state} palette={palette} />
    </main>
  );
}

export default function CodeMap834Prototype(): JSX.Element {
  const state = usePrototypeState();
  const palette = usePalette();

  if (!palette) return <Text>Measuring argo-universal</Text>;

  return <Shell state={state} palette={palette} />;
}
