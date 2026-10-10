import { ComposerSheetContent } from '@repo/client';
import type * as React from 'react';
import { useSheetHeight } from '@/navigation/use-sheet-height';

export default function ComposerSheetPage(): React.JSX.Element {
  return <ComposerSheetContent onContentHeightChange={useSheetHeight()} />;
}
