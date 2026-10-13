import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAgentModelConfiguration } from './agent-model-sheet-context';
import {
  AgentChoices,
  AgentModelMenu,
  ModelChoices,
} from './composer-configuration/composer-configuration';

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
  useEffect(() => onContentHeightChange(0), [onContentHeightChange]);
  if (!configuration) return null;
  return (
    <View className="flex-1 bg-sidebar">
      <AgentModelMenu configuration={configuration} onOpenPage={onOpenPage} />
    </View>
  );
}

interface AgentModelSheetChoicesProps {
  page: 'agent' | 'model';
  onDone: () => void;
  // The sheet sizes itself to this page.
  onContentHeightChange: (height: number) => void;
}

export function AgentModelSheetChoices({
  page,
  onDone,
  onContentHeightChange,
}: AgentModelSheetChoicesProps): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();
  if (!configuration) return null;
  const Choices = page === 'agent' ? AgentChoices : ModelChoices;
  return (
    <View className="flex-1 bg-sidebar">
      <Choices
        configuration={configuration}
        onSelect={onDone}
        onContentHeightChange={onContentHeightChange}
      />
    </View>
  );
}
