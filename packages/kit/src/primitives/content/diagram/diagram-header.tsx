import { diagramTitle } from '@repo/contracts/kit-diagram';
import type * as React from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import { CodeBlockHeader } from '#primitives/content/code';
import type { DiagramState } from './use-diagram-drawing';

export type Shown = 'diagram' | 'code';

export interface DiagramHeaderProps {
  source: string;
  state: DiagramState;
  shown: Shown;
  onToggle: () => void;
}

const failedNote = 'Couldn’t draw this diagram';

function toggleProps(
  shown: Shown,
): Pick<
  React.ComponentProps<typeof IconButton>,
  'icon' | 'accessibilityLabel'
> {
  return shown === 'code'
    ? { icon: 'diagram', accessibilityLabel: 'Show diagram' }
    : { icon: 'code', accessibilityLabel: 'Show code' };
}

function ToggleButton(
  props: Pick<DiagramHeaderProps, 'shown' | 'onToggle'>,
): React.JSX.Element {
  return (
    <IconButton
      size="sm"
      variant="ghost"
      muted
      {...toggleProps(props.shown)}
      onPress={props.onToggle}
    />
  );
}

function headerExtras({
  state,
  shown,
  onToggle,
}: DiagramHeaderProps): Pick<
  React.ComponentProps<typeof CodeBlockHeader>,
  'note' | 'actions'
> {
  if (state.kind === 'failed') return { note: failedNote };

  return {
    actions: state.kind === 'drawn' && (
      <ToggleButton shown={shown} onToggle={onToggle} />
    ),
  };
}

export function DiagramHeader(props: DiagramHeaderProps): React.JSX.Element {
  return (
    <CodeBlockHeader
      title={diagramTitle(props.source) ?? 'mermaid'}
      glyph="diagram"
      copyValue={props.source}
      {...headerExtras(props)}
    />
  );
}
