import { expect, it } from 'vitest';
import { resourceInitialization, resourceLaunch } from '#mocks/acp-resource';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createLoginAgentOpener } from './index';

it('runs terminal authentication with configured launch plus advertised additions and reinitializes without authenticate', async () => {
  const requests: object[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: {
      ...resourceInitialization,
      authMethods: [
        {
          type: 'terminal',
          id: 'terminal',
          name: 'Terminal',
          args: ['--login'],
          env: { LOGIN_MODE: 'interactive' },
        },
      ],
    },
    responses: { authenticate: [{ requests }] },
  });

  const exited = Promise.withResolvers<{ exitCode: number }>();
  const launches: (typeof resourceLaunch)[] = [];

  const login = await createLoginAgentOpener({
    ...peer,
    launchLoginTerminal: async (launch, output) => {
      launches.push(launch);
      output('Choose an account\r\n');

      return {
        exited: exited.promise,
        write: (): void => {},
        resize: (): void => {},
        close: async (): Promise<void> => {},
      };
    },
  })(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: async () => ({ action: 'cancel' }),
    },
  );

  try {
    const authenticating = login.authenticate('terminal');
    await expect.poll(() => launches.length).toBe(1);
    expect(launches).toEqual([
      {
        ...resourceLaunch,
        args: ['--login'],
        env: { LOGIN_MODE: 'interactive' },
      },
    ]);
    expect(login.readTerminal?.(0)).toMatchObject({
      output: 'Choose an account\r\n',
    });
    exited.resolve({ exitCode: 0 });
    await authenticating;
    expect({ requests, processes: peer.processes.length }).toEqual({
      requests: [],
      processes: 2,
    });
  } finally {
    await login.close();
  }
});
