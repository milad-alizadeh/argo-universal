import { RunGuide } from '@repo/contracts';
import {
  runConfigurationsFile,
  runConfigurationSchema,
  type RunConfiguration,
} from './run-configurations';

const example = {
  configurations: [
    {
      name: 'smoke-test',
      command: 'echo ARGO_RUN_READY; sleep 60',
      ready: { pattern: 'ARGO_RUN_READY' },
    },
  ],
} satisfies {
  configurations: Pick<RunConfiguration, 'name' | 'command' | 'ready'>[];
};

export function runGuide(): RunGuide {
  return RunGuide.parse({
    path: runConfigurationsFile,
    template: `${JSON.stringify(example, null, 2)}\n`,
    schema: runConfigurationSchema(),
    instructions: [
      `Save the template as ${runConfigurationsFile} at the root of the Session’s Checkout. It accepts JSON with comments and trailing commas.`,
      'If the Checkout already has a supported .claude/launch.json or .vscode/launch.json, use run.draft to import it.',
      'Give each Run Configuration a unique name and a shell command. Replace the smoke-test command with the command that starts your Project.',
      'Never write a fixed port into a command. Each Checkout gets its own ports: pass $PORT to the server’s port flag, such as `expo start --port $PORT` or `vite --port $PORT`, and $ARGO_PORT_1 to $ARGO_PORT_9 to any further server the same Run starts. Set port only when something outside the Checkout needs that exact port, such as an OAuth callback; then only one Checkout can run it at a time.',
      'For a server that listens on $PORT, leave out ready. For a Run without a listening port, use a ready.pattern regular expression that matches its output.',
      'Groups refer to Run Configuration names in members. The optional default refers to a group name.',
      'Run run.status to validate the saved file without starting anything. It reports the location of invalid syntax or fields.',
      'After reviewing the command, use run.start with the Run Configuration name. Use run.stop to stop it.',
    ],
  });
}
