import type * as React from 'react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { SheetNavigationProvider } from '#primitives/overlays/bottom-sheet';
import { useAgentModelConfiguration } from './agent-model-sheet-context';
import { AgentModelMenu } from './composer-configuration/composer-configuration';

type SheetPage = { title: string; content: ReactNode };

// The page a drill row last pushed: the sheet's native stack shows it on a route of its own.
let pushedPage: SheetPage | undefined;

interface AgentModelSheetSettingsProps {
  // Shows the pushed page's route.
  onOpenPage: () => void;
  // Returns from the pushed page.
  onBack: () => void;
  onContentHeightChange: (height: number) => void;
}

export function AgentModelSheetSettings(
  props: AgentModelSheetSettingsProps,
): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();
  const navigation = useRoutedPages(props);
  useMinimumHeight(props.onContentHeightChange);

  if (!configuration) return null;

  return (
    <SheetNavigationProvider value={navigation}>
      <View className="flex-1 bg-content">
        <AgentModelMenu configuration={configuration} />
      </View>
    </SheetNavigationProvider>
  );
}

// The sheet keeps Configure's own height.
function useMinimumHeight(
  onContentHeightChange: (height: number) => void,
): void {
  useEffect(() => onContentHeightChange(0), [onContentHeightChange]);
}

// A pushed page waits here while the native stack shows its route.
function useRoutedPages({ onOpenPage, onBack }: AgentModelSheetSettingsProps): {
  push: (page: SheetPage) => void;
  back: () => void;
} {
  return useMemo(
    () => ({
      push: (page: SheetPage): void => {
        pushedPage = page;
        onOpenPage();
      },
      back: onBack,
    }),
    [onOpenPage, onBack],
  );
}

interface AgentModelSheetPageProps {
  // Names the route, such as "Select Agent".
  onTitle: (title: string) => void;
  onContentHeightChange: (height: number) => void;
}

// The options a drill row pushed, such as the Agents.
export function AgentModelSheetPage(
  props: AgentModelSheetPageProps,
): React.JSX.Element | null {
  const page = pushedPage;
  const { onTitle, onContentHeightChange } = props;
  useEffect(() => {
    if (page) onTitle(page.title);
    onContentHeightChange(0);
  }, [page, onTitle, onContentHeightChange]);

  if (!page) return null;

  return <View className="flex-1 bg-content">{page.content}</View>;
}
