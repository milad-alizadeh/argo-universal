import { Text } from '@repo/kit/text';
/*
 * Throwaway renderer feasibility check using Atlas masters 8G-0 / AU-0 / CZ-0.
 * This route has no Plugin registry or production API.
 */
import type { JSX } from 'react';
import { usePalette, type Palette } from './code-map';
import { Diagnostics, Footer, Header } from './page/page-details';
import { MapArea } from './page/page-map';
import { main } from './page/page-styles';
import { usePrototypeState, type PrototypeState } from './page/prototype-state';

interface PageProps {
  state: PrototypeState;
  palette: Palette;
}

function Page({ state, palette }: PageProps): JSX.Element {
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

  return <Page state={state} palette={palette} />;
}
