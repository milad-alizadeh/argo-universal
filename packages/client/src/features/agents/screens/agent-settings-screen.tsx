import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { AgentPlaceholder } from '../components/agent-placeholder';
import {
  CustomAgentForm,
  type CustomAgentFormProps,
} from '../components/custom-agent-form';
import {
  CustomAgentPage,
  LaunchValues,
  Section,
} from '../components/custom-agent-page';
import { SettingsScroll } from '../components/settings-scroll';
import {
  type CustomAgent,
  useAgentCheck,
  useCustomAgentMutations,
  useCustomAgents,
} from '../hooks/use-custom-agents';

export interface AgentSettingsScreenProps {
  agent: string;
}

export function AgentSettingsScreen({
  agent,
}: AgentSettingsScreenProps): React.JSX.Element {
  const custom = useCustomAgents().data?.find(({ id }) => id === agent);
  if (!custom) return <AgentPlaceholder agent={agent} />;
  return <CustomAgentDetail agent={custom} />;
}

type DetailProps = { agent: CustomAgent };

function CustomAgentDetail(props: DetailProps): React.JSX.Element {
  const check = useAgentCheck(props.agent.id, true);
  return (
    <SettingsScroll>
      <CustomAgentScreenBody
        agent={props.agent}
        check={check.isFetching ? undefined : check.data}
        onCheck={() => void check.refetch()}
      />
    </SettingsScroll>
  );
}

type BodyProps = {
  agent: CustomAgent;
  check: React.ComponentProps<typeof CustomAgentPage>['check'];
  onCheck: () => void;
};

function CustomAgentScreenBody(props: BodyProps): React.JSX.Element {
  return (
    <CustomAgentPage
      definition={props.agent.definition}
      check={props.check}
      onCheck={props.onCheck}
      launch={<LaunchSection agent={props.agent} />}
    />
  );
}

function useSaveAgent(
  agentId: string,
  onSaved: () => void,
): CustomAgentFormProps['onSubmit'] {
  const { edit } = useCustomAgentMutations();
  return async (definition) => {
    const result = await edit(agentId, definition);
    if (result.status === 'ready') onSaved();
    return result;
  };
}

function LaunchSection({ agent }: { agent: CustomAgent }): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const close = (): void => setEditing(false);
  if (editing) return <LaunchForm agent={agent} onClose={close} />;
  return (
    <Section
      title="Launch"
      action={<EditButton onPress={() => setEditing(true)} />}
    >
      <LaunchValues definition={agent.definition} />
    </Section>
  );
}

type LaunchProps = { agent: CustomAgent; onClose: () => void };

function LaunchForm(props: LaunchProps): React.JSX.Element {
  const onSubmit = useSaveAgent(props.agent.id, props.onClose);
  return (
    <View className="gap-3">
      <CustomAgentForm
        initial={props.agent.definition}
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={props.onClose}
      />
    </View>
  );
}

function EditButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Button variant="outline" size="sm" onPress={onPress}>
      <Text>Edit</Text>
    </Button>
  );
}
