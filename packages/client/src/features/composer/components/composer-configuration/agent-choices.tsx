import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { FieldRowEnd } from '../../../../lib/generic/primitives/fields/field-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentChoice } from './agent-choice';
import type { ComposerConfigurationProps } from './configuration-types';

const maximumHeight = 320;
const screenFraction = 0.6;

export function AgentChoices({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}): React.JSX.Element {
  const wide = useWide();
  const { height } = useWindowDimensions();
  const { agents } = configuration;
  if (Platform.OS !== 'web' && !wide)
    return (
      <FieldGroup>
        <FieldSection>
          {agents.map((agent) => (
            <AgentChoice
              key={agent.agent}
              agent={agent}
              configuration={configuration}
              onSelect={onSelect}
            />
          ))}
        </FieldSection>
      </FieldGroup>
    );
  const current = agents.findIndex(
    (agent) => agent.agent === configuration.agent,
  );
  return (
    <View className="px-4 wide:px-0">
      <FieldSection>
        <ScrollFadeList
          {...listTestIdProps('composer-agents-scroll')}
          surfaceClassName="bg-sidebar"
          maxHeight={wide ? maximumHeight : height * screenFraction}
          data={agents}
          initialScrollIndex={current > 0 ? current : undefined}
          keyExtractor={(agent: AgentInfo) => agent.agent}
          renderItem={({ item, index }) => (
            <FieldRowEnd value={index === agents.length - 1}>
              <View>
                <AgentChoice
                  agent={item}
                  configuration={configuration}
                  onSelect={onSelect}
                />
              </View>
            </FieldRowEnd>
          )}
          estimatedItemSize={52}
          extraData={configuration}
        />
      </FieldSection>
    </View>
  );
}
