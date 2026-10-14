import type * as React from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import {
  Alert,
  type AlertAction,
} from '../../../../lib/generic/primitives/overlays/alert/alert';
import type { AgentDetail } from '../../state/agent-detail-types';
import {
  homebrewCommand,
  missingTool,
  missingToolAlertMessage,
  missingToolFooter,
  type ToolFacts,
  type ToolInstallPresentation,
} from '../../state/missing-tool';
import { ToolDownloads } from './tool-downloads';

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
    <FieldSection title="Status" footer={statusFooter(props)}>
      <ListItem
        title={`${props.facts.name} not found`}
        status={{ tone: 'warning', label: '' }}
      />
      <ToolAction facts={props.facts} tool={props.tool} />
    </FieldSection>
  );
}

// With Homebrew Argo installs the tool; without it, the download pages and Recheck.
function ToolAction(props: {
  facts: Facts;
  tool?: ToolInstallPresentation;
}): React.JSX.Element {
  const homebrew = withHomebrew(props.tool);

  if (homebrew) return <HomebrewAction facts={props.facts} tool={homebrew} />;

  return <ToolDownloads facts={props.facts} tool={props.tool} />;
}

// Homebrew's progress shows in place of its action until it settles.
function HomebrewAction({ facts, tool }: ToolProps): React.JSX.Element {
  if (tool.installing) return <HomebrewProgress facts={facts} />;

  return (
    <ListItem
      role="button"
      tone="accent"
      title={`Install ${facts.name} with Homebrew`}
      onPress={() => tool.onConfirmingChange(true)}
    />
  );
}

function HomebrewProgress({ facts }: { facts: Facts }): React.JSX.Element {
  return (
    <ListItem
      title={`Installing ${facts.name}…`}
      status={{ tone: 'pending', label: '' }}
      disabled
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
