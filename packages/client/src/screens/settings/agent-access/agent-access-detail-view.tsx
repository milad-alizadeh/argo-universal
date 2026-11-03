import { productName } from '@repo/contracts/product-identity';
import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';

export type AgentAccessLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; enabled: boolean };

export interface AgentAccessDetailViewProps {
  access: AgentAccessLoad;
  saving?: boolean;
  installing?: boolean;
  installed?: 'written' | 'updated';
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onInstall: () => void;
  onRetry: () => void;
  onBack?: () => void;
}

export function AgentAccessDetailView(
  props: AgentAccessDetailViewProps,
): React.JSX.Element {
  return (
    <Screen title="Agent access" onBack={props.onBack}>
      <FieldGroup>
        {accessSection(props)}
        {instructionsSection(props)}
        {statusSection(props)}
      </FieldGroup>
    </Screen>
  );
}

function accessSection(props: AgentAccessDetailViewProps): React.JSX.Element {
  const access = props.access;

  return (
    <FieldGroup.Section
      footer={`New Sessions receive ${productName} tools automatically, the ${productName} CLI and their own token. Existing Sessions keep their access.`}
    >
      <FieldGroup.Toggle
        title={`Agent access to ${productName}`}
        value={access.status === 'loaded' && access.enabled}
        disabled={access.status !== 'loaded' || props.saving}
        onValueChange={props.onEnabledChange}
      />
    </FieldGroup.Section>
  );
}

const instructionsFooter = `For Agents you run outside ${productName}, optionally install CLI instructions and a Codex rule in your home folder on the Server.`;

function instructionsSection(
  props: AgentAccessDetailViewProps,
): React.JSX.Element {
  return (
    <FieldGroup.Section footer={instructionsFooter}>
      <Button
        label={`Add ${productName} to your Agents`}
        variant="text"
        onPress={props.onInstall}
        disabled={props.access.status !== 'loaded'}
        loading={props.installing}
      />
    </FieldGroup.Section>
  );
}

const messages = {
  loading: 'Loading Agent access…',
  error: 'Could not load Agent access.',
  disconnected: 'Connect to the Server to change Agent access.',
  written: `${productName} instructions added to your Agents.`,
  updated: `${productName} instructions updated for your Agents.`,
};

function statusSection(
  props: AgentAccessDetailViewProps,
): React.JSX.Element | null {
  const status = props.access.status;
  const message = props.error ?? statusMessage(props);

  if (!message) return null;

  return (
    <FieldGroup.Section footer={message}>
      {retryButton(status, props.onRetry)}
    </FieldGroup.Section>
  );
}

function statusMessage(props: AgentAccessDetailViewProps): string | undefined {
  if (props.access.status !== 'loaded') return messages[props.access.status];

  return props.installed ? messages[props.installed] : undefined;
}

function retryButton(
  status: AgentAccessLoad['status'],
  onRetry: () => void,
): React.JSX.Element | null {
  return status === 'error' ? (
    <Button label="Retry" variant="text" onPress={onRetry} />
  ) : null;
}
