import { Text } from '@repo/client/text';
import type { JSX } from 'react';
import type { Palette } from '../code-map';
import { useEvidence } from '../evidence';
import { source } from './dataset';
import { diagnosticStyle } from './page-styles';
import type { PrototypeState } from './prototype-state';

export function Header({ state }: { state: PrototypeState }): JSX.Element {
  return (
    <Text>
      PROTOTYPE #834 · argo-universal · {state.files.length.toLocaleString()}{' '}
      files{' '}
      {state.count
        ? `(stress replicas of ${source.files.length} real files)`
        : ''}
    </Text>
  );
}

/** The label count is measurement evidence the Code Map reports; only this line re-renders for it. */
export function Footer({ state }: { state: PrototypeState }): JSX.Element {
  const labels = useEvidence((record) => record.labels ?? 0);

  const instructions =
    state.view === '3d'
      ? 'Drag to orbit · right-drag to pan · wheel to zoom'
      : 'Drag to pan · wheel to zoom';

  return (
    <Text>
      {instructions} · {labels} visible labels ·{' '}
      {state.selectedId ? `onSelect: ${state.selectedId}` : 'Select a file'}
    </Text>
  );
}

export function Diagnostics({ palette }: { palette: Palette }): JSX.Element {
  const info = useEvidence((record) => record.info);

  return (
    <output style={diagnosticStyle(palette)}>
      {JSON.stringify(info ?? {})}
    </output>
  );
}
