import { validateChartFence } from '@repo/contracts/chart-fence';
import { ChartPreviewDraft } from '@repo/contracts/operations/chart';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Uniwind } from 'uniwind';
import { FeedContent } from '../feed-content/feed-content';
import { renderChartFence } from './chart-fence';

const rootId = 'chart-preview';

declare global {
  interface Window {
    argoDrawChart?: (draft: ChartPreviewDraft) => boolean;
  }
}

export const isChartPreviewPage = (): boolean =>
  globalThis.window?.location.pathname === '/chart-preview';

function useChartDraft(): ChartPreviewDraft | null {
  const [draft, setDraft] = useState<ChartPreviewDraft | null>(null);

  useEffect((): (() => void) => {
    window.argoDrawChart = (input): boolean => {
      const parsed = ChartPreviewDraft.safeParse(input);

      if (!parsed.success || !validateChartFence(parsed.data.fence).valid)
        return false;

      Uniwind.setTheme(parsed.data.theme);
      setDraft(parsed.data);

      return true;
    };

    return (): void => {
      delete window.argoDrawChart;
    };
  }, []);

  return draft;
}

// This document draws only the draft, with no Server Connection or navigation state.
export function ChartPreviewPage(): React.JSX.Element | null {
  const draft = useChartDraft();

  if (!draft) return null;

  return (
    <View
      nativeID={rootId}
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
