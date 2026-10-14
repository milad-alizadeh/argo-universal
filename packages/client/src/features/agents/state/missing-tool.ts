import type { InstallTool } from '@repo/contracts';
import type { AgentStatus } from './agent-status';

// How a missing-tool install this page started ended; the key tells a new outcome from a repeated one.
export type ToolNotice = { key: string; tool: InstallTool } & (
  | { result: 'installed' }
  | { result: 'failed'; failure: string }
);

export interface ToolInstallPresentation {
  // Homebrew is on the Server, so Argo can install the tool after asking.
  homebrew: boolean;
  // The connected Server's name: where the tool installs.
  server?: string;
  // The Alert showing the command is open.
  confirming: boolean;
  // Homebrew is running; the action shows its progress in place.
  installing: boolean;
  notice?: ToolNotice;
  onConfirmingChange: (open: boolean) => void;
  onInstall: () => void;
}

export interface ToolFacts {
  tool: InstallTool;
  name: string;
  // The Registry distribution that needs the tool.
  runner: string;
  site: string;
  // The official download page; Argo never runs Homebrew's own install script.
  url: string;
}

const toolFacts: Record<InstallTool, ToolFacts> = {
  node: {
    tool: 'node',
    name: 'Node.js',
    runner: 'npx',
    site: 'nodejs.org',
    url: 'https://nodejs.org/en/download',
  },
  uv: {
    tool: 'uv',
    name: 'uv',
    runner: 'uvx',
    site: 'astral.sh',
    url: 'https://docs.astral.sh/uv/getting-started/installation/',
  },
};

export const toolFactsOf = (tool: InstallTool): ToolFacts => toolFacts[tool];

// The tool an Agent's status says is missing, if any.
export const missingTool = (status: AgentStatus): ToolFacts | undefined => {
  if (status === 'needs-node') return toolFacts.node;

  if (status === 'needs-uv') return toolFacts.uv;

  return undefined;
};

export const homebrewCommand = ({ tool }: ToolFacts): string =>
  `brew install ${tool}`;

const serverName = (server?: string): string =>
  server ?? 'the connected Server';

// The Status footer: what Argo will run, or where to get the tool without Homebrew.
export const missingToolFooter = (
  facts: ToolFacts,
  {
    agent,
    homebrew,
    server,
  }: { agent: string; homebrew: boolean; server?: string },
): string =>
  homebrew
    ? `${agent} runs with ${facts.runner}. Argo asks before it runs ${homebrewCommand(facts)} on ${serverName(server)}.`
    : `${agent} runs with ${facts.runner}. Homebrew isn’t on ${serverName(server)}, so install ${facts.name} from ${facts.site}, then come back to this page.`;

export const missingToolAlertMessage = (
  facts: ToolFacts,
  { agent, server }: { agent: string; server?: string },
): string =>
  `${agent} runs with ${facts.runner}, which needs ${facts.name}. Argo runs this with Homebrew on ${serverName(server)}:`;
