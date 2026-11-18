import { expect, it } from 'vitest';
import {
  seededEnvironment,
  vendorRegistryIds,
  vendorSessionEnvironment,
} from './vendor';

// The checklist is Argo's own Operations (ADR-0053), so no Agent's checklist tool is turned on at install.
it.each([vendorRegistryIds.claude, vendorRegistryIds.codex, 'example-agent'])(
  '%s is installed with an empty launch environment',
  (registryId) => {
    expect(seededEnvironment(registryId)).toEqual({});
  },
);

const cliDirectory = '/home/cli/bin';

// pi-acp passes pi neither MCP servers nor a system prompt, so Argo starts pi through its own launcher (ADR-0053).
it('starts pi through the launcher beside argo', () => {
  expect(
    vendorSessionEnvironment(
      { registryId: vendorRegistryIds.pi },
      cliDirectory,
      {},
    ),
  ).toEqual({ PI_ACP_PI_COMMAND: `${cliDirectory}/argo-pi` });
});

it('keeps a pi command the person set, run through the launcher', () => {
  expect(
    vendorSessionEnvironment(
      { registryId: vendorRegistryIds.pi },
      cliDirectory,
      {
        PI_ACP_PI_COMMAND: '/opt/pi/bin/pi',
      },
    ),
  ).toEqual({
    PI_ACP_PI_COMMAND: `${cliDirectory}/argo-pi`,
    ARGO_PI_COMMAND: '/opt/pi/bin/pi',
  });
});

it('adds nothing for any other Agent', () => {
  expect(
    vendorSessionEnvironment(
      { registryId: vendorRegistryIds.claude },
      cliDirectory,
      {},
    ),
  ).toBeUndefined();
});
