import type * as React from 'react';
import { ScrollView } from 'react-native';

// Long enough for a native sheet to finish sliding away before a system picker opens.
const sheetDismissMs = 400;
import {
  useAgentModelConfiguration,
  useNativeSheets,
  useSheetContent,
} from './agent-model-sheet-context';
import {
  AgentChoices,
  AgentModelMenu,
  ModelChoices,
} from './composer-configuration';

// The pages of the native Agent and model sheet; the app stacks them.
export function AgentModelSheetSettings({
  onOpenPage,
  onContentHeightChange,
}: {
  onOpenPage: (page: 'agent' | 'model') => void;
  // The sheet sizes itself to this page.
  onContentHeightChange: (height: number) => void;
}): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();
  if (!configuration) return null;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      onContentSizeChange={(_width, height) => onContentHeightChange(height)}
    >
      <AgentModelMenu configuration={configuration} onOpenPage={onOpenPage} />
    </ScrollView>
  );
}

export function AgentModelSheetAgents({
  onDone,
}: {
  onDone: () => void;
}): React.JSX.Element | null {
  return <AgentModelSheetChoices onDone={onDone} Choices={AgentChoices} />;
}

export function AgentModelSheetModels({
  onDone,
}: {
  onDone: () => void;
}): React.JSX.Element | null {
  return <AgentModelSheetChoices onDone={onDone} Choices={ModelChoices} />;
}

function AgentModelSheetChoices({
  onDone,
  Choices,
}: {
  onDone: () => void;
  Choices: typeof AgentChoices | typeof ModelChoices;
}): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();
  if (!configuration) return null;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Choices configuration={configuration} onSelect={onDone} />
    </ScrollView>
  );
}

// Any other Composer menu, drawn as the one page of a native sheet.
export function ComposerSheetContent({
  onContentHeightChange,
}: {
  onContentHeightChange: (height: number) => void;
}): React.JSX.Element | null {
  const content = useSheetContent();
  const sheets = useNativeSheets();
  if (!content || !sheets) return null;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={(_width, height) => onContentHeightChange(height)}
    >
      {content.render((after) => {
        sheets.close();
        if (after) setTimeout(after, sheetDismissMs);
      })}
    </ScrollView>
  );
}

export function useSheetLabel(): string | undefined {
  return useSheetContent()?.label;
}
