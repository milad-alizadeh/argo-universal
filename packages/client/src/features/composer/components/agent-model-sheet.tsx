import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAgentModelConfiguration } from './agent-model-sheet-context';
import {
  AgentChoices,
  AgentModelMenu,
  ModelChoices,
} from './composer-configuration/composer-configuration';

interface AgentModelSheetSettingsProps {
  onOpenPage: (page: 'agent' | 'model') => void;
  onContentHeightChange: (height: number) => void;
}

export function AgentModelSheetSettings({
  onOpenPage,
  onContentHeightChange,
}: AgentModelSheetSettingsProps): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();
  useEffect(() => onContentHeightChange(0), [onContentHeightChange]);

  if (!configuration) return null;

  return (
    <View className="flex-1">
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

export function AgentModelSheetChoices(
  props: AgentModelSheetChoicesProps,
): React.JSX.Element | null {
  const configuration = useAgentModelConfiguration();

  if (!configuration) return null;

  return (
    <View className="flex-1">
      <PageChoices {...props} configuration={configuration} />
    </View>
  );
}

interface PageChoicesProps extends AgentModelSheetChoicesProps {
  configuration: NonNullable<ReturnType<typeof useAgentModelConfiguration>>;
}

function PageChoices({
  page,
  onDone,
  ...choices
}: PageChoicesProps): React.JSX.Element {
  const Choices = page === 'agent' ? AgentChoices : ModelChoices;

  return <Choices {...choices} onSelect={onDone} />;
}
