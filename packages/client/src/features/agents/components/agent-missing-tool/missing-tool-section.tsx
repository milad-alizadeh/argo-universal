import type * as React from 'react';
import {
  Alert,
  type AlertAction,
} from '../../../../lib/generic/primitives/overlays/alert/alert';
import type { AgentDetail } from '../../state/agent-detail-types';
import { agentStatusLabels } from '../../state/agent-status';
import {
  homebrewCommand,
  missingTool,
  missingToolAlertMessage,
  missingToolFooter,
  type ToolFacts,
  type ToolInstallPresentation,
} from '../../state/missing-tool';
import {
  StatusButton,
  StatusSection,
} from '../agent-status-section/agent-status-section';

type Facts = ToolFacts;

type SectionProps = { agent: AgentDetail; tool?: ToolInstallPresentation };

type MissingProps = SectionProps & { facts: Facts };

type ToolProps = { facts: Facts; tool: ToolInstallPresentation };

type ConfirmationProps = ToolProps & { agent: AgentDetail };

// Needs Node.js or Needs uv: what is missing and how to get it, in place of Install.
export function MissingToolSection(
  props: SectionProps,
): React.JSX.Element | null {
  const facts = missingTool(props.agent.status);

  if (!facts) return null;

  return <MissingTool {...props} facts={facts} />;
}

// Homebrew on the Server is what lets Argo install the tool itself.
const withHomebrew = (
  tool?: ToolInstallPresentation,
): ToolInstallPresentation | undefined => (tool?.homebrew ? tool : undefined);

function MissingTool(props: MissingProps): React.JSX.Element {
  const homebrew = withHomebrew(props.tool);

  return (
    <>
      <MissingToolStatus {...props} />
      {homebrew ? <HomebrewConfirmation {...props} tool={homebrew} /> : null}
    </>
  );
}

const statusFooter = ({ agent, tool, facts }: MissingProps): string =>
  missingToolFooter(facts, {
    agent: agent.name,
    homebrew: !!tool?.homebrew,
    server: tool?.server,
  });

function MissingToolStatus(props: MissingProps): React.JSX.Element {
  return (
    <StatusSection
      label={agentStatusLabels[props.agent.status]}
      tone="warning"
      footer={statusFooter(props)}
      action={<ToolAction facts={props.facts} tool={props.tool} />}
    />
  );
}

// With Homebrew Argo installs the tool; without it, Recheck once it is installed.
function ToolAction(props: {
  facts: Facts;
  tool?: ToolInstallPresentation;
}): React.JSX.Element | null {
  const homebrew = withHomebrew(props.tool);

  if (homebrew) return <HomebrewAction facts={props.facts} tool={homebrew} />;

  return props.tool ? <ToolRecheck tool={props.tool} /> : null;
}

// Homebrew's progress shows on its button until it settles.
function HomebrewAction({ facts, tool }: ToolProps): React.JSX.Element {
  return (
    <StatusButton
      label={`Install ${facts.name} with Homebrew`}
      onPress={() => tool.onConfirmingChange(true)}
      busy={tool.installing}
    />
  );
}

function ToolRecheck({
  tool,
}: {
  tool: ToolInstallPresentation;
}): React.JSX.Element {
  return (
    <StatusButton
      label="Recheck"
      onPress={tool.onRecheck}
      busy={tool.rechecking}
    />
  );
}

const confirmationActions = (
  tool: ToolInstallPresentation,
): readonly AlertAction[] => [
  { label: 'Cancel', role: 'cancel' },
  { label: 'Install', onPress: tool.onInstall },
];

const confirmationMessage = ({
  agent,
  facts,
  tool,
}: ConfirmationProps): string =>
  missingToolAlertMessage(facts, { agent: agent.name, server: tool.server });

// The Alert shows the exact command before Homebrew runs.
function HomebrewConfirmation(props: ConfirmationProps): React.JSX.Element {
  const { facts, tool } = props;

  return (
    <Alert
      open={tool.confirming}
      onOpenChange={tool.onConfirmingChange}
      title={`Install ${facts.name}?`}
      message={confirmationMessage(props)}
      command={homebrewCommand(facts)}
      actions={confirmationActions(tool)}
    />
  );
}
