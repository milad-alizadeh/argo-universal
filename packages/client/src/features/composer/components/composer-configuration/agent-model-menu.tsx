import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Text } from '#primitives/display/text/text';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { PopoverHoverGroup } from '#primitives/overlays/popover/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentChoices } from './agent-choices';
import { ConfigurationDrill } from './configuration-drill';
import { EffortControl, SwitchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';
import { ModelChoices } from './model-choices';

export function AgentModelMenu({
  configuration,
  onOpenPage,
}: {
  configuration: ComposerConfigurationProps;
  onOpenPage?: (page: 'agent' | 'model') => void;
}): React.JSX.Element {
  const wide = useWide() && Platform.OS === 'web';
  const tuning =
    switches(configuration).length > 0 ||
    !!currentEffort(configuration).selected;
  const notice = configuration.turnRunning
    ? 'A Turn is running. Changes apply from the next Turn.'
    : undefined;
  const [page, setPage] = useState<'settings' | 'agent' | 'model'>('settings');
  if (!wide && page !== 'settings')
    return (
      <View className="min-h-80 bg-sidebar">
        <View className="h-11 px-4 flex-row items-center">
          <IconButton
            variant="ghost"
            accessibilityLabel="Back to Configure"
            onPress={() => setPage('settings')}
            icon="chevron-left"
          />
          <Text role="control" className="flex-1 text-center">
            {page === 'agent' ? 'Select Agent' : 'Select Model'}
          </Text>
          <View className="size-11" />
        </View>
        {page === 'agent' ? (
          <AgentChoices
            configuration={configuration}
            onSelect={() => setPage('settings')}
          />
        ) : (
          <ModelChoices
            configuration={configuration}
            onSelect={() => setPage('settings')}
          />
        )}
      </View>
    );
  return (
    <View className="native:flex-1 wide:p-3 bg-sidebar">
      <FieldGroup fit={Platform.OS === 'web' || wide}>
        {wide && (
          <Text role="heading" aria-level={2} className="px-4 pt-1">
            Configure
          </Text>
        )}
        <PopoverHoverGroup>
          <FieldSection footer={tuning ? undefined : notice}>
            <ConfigurationDrill
              configuration={configuration}
              page="agent"
              onOpenPage={onOpenPage ?? setPage}
            />
            <ConfigurationDrill
              configuration={configuration}
              page="model"
              onOpenPage={onOpenPage ?? setPage}
            />
          </FieldSection>
        </PopoverHoverGroup>
        {tuning && (
          <FieldSection footer={notice}>
            <SwitchOptions configuration={configuration} />
            <EffortControl configuration={configuration} />
          </FieldSection>
        )}
      </FieldGroup>
    </View>
  );
}
