import { validateChartFence } from '@repo/contracts/chart-fence';
import {
  chartPreviewFragment,
  chartPreviewRendererKey,
  ChartPreviewDraft,
  type ChartPreviewBounds,
  type ChartPreviewRenderer,
} from '@repo/contracts/operations/chart';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Uniwind } from 'uniwind';
import { FeedContent } from '../feed-content/feed-content';
import { renderChartFence } from './chart-fence';
import {
  awaitChartDrawing,
  chartPreviewRootId,
} from './chart-preview-drawing.web';

declare global {
  interface Window {
    [chartPreviewRendererKey]?: ChartPreviewRenderer;
  }
}

export const isChartPreviewDocument = (): boolean =>
  globalThis.window?.location.hash === chartPreviewFragment;

function useChartDraft(): ChartPreviewDraft | null {
  const [draft, setDraft] = useState<ChartPreviewDraft | null>(null);

  useEffect((): (() => void) => {
    const renderer: ChartPreviewRenderer = {
      async draw(input): Promise<ChartPreviewBounds | null> {
        const parsed = ChartPreviewDraft.safeParse(input);

        if (!parsed.success || !validateChartFence(parsed.data.fence).valid)
          return null;

        Uniwind.setTheme(parsed.data.theme);
        setDraft(parsed.data);

        return awaitChartDrawing();
      },
    };

    window[chartPreviewRendererKey] = renderer;

    return (): void => {
      delete window[chartPreviewRendererKey];
    };
  }, []);

  return draft;
}

// The isolated web document draws the draft without a Connection or App navigation.
export function ChartPreviewDocument(): React.JSX.Element | null {
  const draft = useChartDraft();

  if (!draft) return null;

  return (
    <View
      nativeID={chartPreviewRootId}
      className="bg-content"
      style={{ width: draft.width }}
    >
      <FeedContent
        content={[{ type: 'text', text: draft.fence }]}
        renderFence={renderChartFence}
      />
    </View>
  );
}
