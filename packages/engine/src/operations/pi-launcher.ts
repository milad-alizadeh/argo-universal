import { join } from 'node:path';
import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
import { productCompatibility } from '@repo/contracts/product-identity';
import { quote, type LauncherFile } from './launcher-file';

const { environment, piExtension: extensionName } = productCompatibility;

/*
 * pi-acp starts `pi --mode rpc` and passes pi neither the Session's MCP servers nor an ACP system prompt (ADR-0053).
 * So a pi Session starts through this launcher, which loads an extension that adds both; a pi command the person set still runs.
 */
const piLauncher = (directory: string): string => `#!/bin/sh
exec "\${${environment.piCommand}:-pi}" -e ${quote(join(directory, extensionName))} "$@"
`;

// Direct exposure declares `operation_run` to the model, so it needs no codemode script or tool search to reach the checklist Operations.
const extensionBody = `
export default function argoSession(pi) {
  const token = process.env.${environment.token};

  if (!token) return;

  const todoList = process.env.${environment.todoList} !== '0';
  const env = { ${environment.token}: token, ${environment.home}: process.env.${environment.home} ?? '' };

  if (!todoList) env.${environment.todoList} = '0';

  pi.registerMcpServer('${productCompatibility.mcpServer}', {
    command: argo,
    args: ['mcp'],
    env,
    exposure: 'direct',
    description: 'Run Argo Operations for this Session with operation_run.',
  });

  const text = todoList ? instructions.on : instructions.off;

  pi.on('before_agent_start', (event) => ({
    systemPrompt: \`\${event.systemPrompt}\\n\\n\${text}\`,
  }));
}
`;

// Both forms of the instructions are written in, because the person's choice reaches pi only as an environment variable at launch.
const piExtension = (directory: string): string =>
  [
    `// Written by ${productCompatibility.command}; the Server writes it again when it starts a pi Session.`,
    `const argo = ${JSON.stringify(join(directory, productCompatibility.command))};`,
    `const instructions = ${JSON.stringify({
      on: argoInstructionsMarkdown({ todoList: true }),
      off: argoInstructionsMarkdown({ todoList: false }),
    })};`,
    extensionBody,
  ].join('\n');

// The files beside the \`argo\` launcher that start pi for a Session.
export const piLauncherFiles = (directory: string): LauncherFile[] => [
  { name: extensionName, content: piExtension(directory), mode: 0o644 },
  {
    name: productCompatibility.piLauncher,
    content: piLauncher(directory),
    mode: 0o755,
  },
];
