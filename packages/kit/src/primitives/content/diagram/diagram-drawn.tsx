import {
  type DiagramDrawing,
  diagramLabel,
  diagramTitle,
} from '@repo/contracts/kit-diagram';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { trayCardClassName } from '#kit/tray-surface';
import { cn } from '#kit/utils';
import { DiagramArtwork } from './diagram-artwork';
import { DiagramViewer } from './diagram-viewer';

interface DrawnDiagramProps {
  source: string;
  drawing: DiagramDrawing;
}

// The drawing in the Feed, and the full-screen view a press opens.
export function DrawnDiagram({
  source,
  drawing,
}: DrawnDiagramProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const label = diagramLabel(source);
  const viewer = { drawing, label, title: diagramTitle(source) ?? label };
  const artwork = { drawing, label, onOpen: (): void => setOpen(true) };

  return (
    <View className={cn(trayCardClassName, 'p-3')}>
      <DiagramArtwork {...artwork} />
      {open && <DiagramViewer {...viewer} onClose={() => setOpen(false)} />}
    </View>
  );
}
