import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { trayClassName } from '#kit/tray-surface';
import { cn } from '#kit/utils';
import { CodeBlockBody, codeBlockGroup } from '#primitives/content/code';
import { DrawnDiagram } from './diagram-drawn';
import {
  type DiagramHeaderProps,
  DiagramHeader,
  type Shown,
} from './diagram-header';
import { DiagramPlaceholder } from './diagram-placeholder';
import type { DiagramProps } from './diagram-props';
import { useDiagramDrawing } from './use-diagram-drawing';

type BodyProps = Omit<DiagramHeaderProps, 'onToggle'>;

function ShownDiagram({ source, state, shown }: BodyProps): React.JSX.Element {
  if (state.kind === 'drawn' && shown === 'diagram')
    return <DrawnDiagram source={source} drawing={state.drawing} />;

  return <CodeBlockBody code={source} language="mermaid" />;
}

function DiagramBody(props: BodyProps): React.JSX.Element {
  if (props.state.kind === 'pending') return <DiagramPlaceholder />;

  return <ShownDiagram {...props} />;
}

export function Diagram({
  source,
  pending = false,
}: DiagramProps): React.JSX.Element {
  const state = useDiagramDrawing(source, pending);
  const [shown, setShown] = useState<Shown>('diagram');
  const view = { source, state, shown };
  const onToggle = (): void => setShown(shown === 'code' ? 'diagram' : 'code');

  return (
    <View className={cn(codeBlockGroup, trayClassName)}>
      <DiagramHeader {...view} onToggle={onToggle} />
      <DiagramBody {...view} />
    </View>
  );
}
