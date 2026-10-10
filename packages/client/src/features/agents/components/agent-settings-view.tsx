import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import { AgentPlaceholder } from './agent-placeholder';
import { CustomAgentForm } from './custom-agent-form';
import { CustomAgentPage, LaunchValues, Section } from './custom-agent-page';
import type { CustomAgentCheck } from './custom-agent-status';
import { SettingsScroll } from './settings-scroll';

export type AgentSettingsViewProps = {
  agentId: string;
  // Absent until the Server lists the Agent as custom; other Agents get a placeholder.
  definition: CustomAgentDefinition | undefined;
  // Absent while the Server checks the program again.
  check: CustomAgentCheck;
  onCheck: () => void;
  onSave: SubmitCustomAgent;
};
type SettingsProps = Omit<AgentSettingsViewProps, 'agentId' | 'definition'> & {
  definition: CustomAgentDefinition;
};
type LaunchProps = Pick<SettingsProps, 'definition' | 'onSave'>;
type LaunchFormProps = LaunchProps & { onClose: () => void };

export function AgentSettingsView({
  agentId,
  definition,
  ...settings
}: AgentSettingsViewProps): React.JSX.Element {
  if (!definition) return <AgentPlaceholder agent={agentId} />;
  return <CustomAgentSettings definition={definition} {...settings} />;
}

function CustomAgentSettings(props: SettingsProps): React.JSX.Element {
  return (
    <SettingsScroll>
      <CustomAgentPage
        definition={props.definition}
        check={props.check}
        onCheck={props.onCheck}
        launch={<LaunchSection {...props} />}
      />
    </SettingsScroll>
  );
}

function LaunchSection(props: LaunchProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const close = (): void => setEditing(false);
  if (editing) return <LaunchForm {...props} onClose={close} />;
  return (
    <Section
      title="Launch"
      action={<EditButton onPress={() => setEditing(true)} />}
    >
      <LaunchValues definition={props.definition} />
    </Section>
  );
}

function EditButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Button variant="outline" size="sm" onPress={onPress}>
      <Text>Edit</Text>
    </Button>
  );
}

// The read-only values return once the edited program passes its check.
const closeWhenSaved =
  ({
    onSave,
    onClose,
  }: Omit<LaunchFormProps, 'definition'>): SubmitCustomAgent =>
  async (edited) => {
    const result = await onSave(edited);
    if (result.status === 'ready') onClose();
    return result;
  };

function LaunchForm(props: LaunchFormProps): React.JSX.Element {
  return (
    <CustomAgentForm
      initial={props.definition}
      submitLabel="Save"
      onSubmit={closeWhenSaved(props)}
      onCancel={props.onClose}
    />
  );
}
