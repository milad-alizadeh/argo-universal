import type { OpenLoginAgent } from '../agents';
import { AcpLoginConnection, initializeOrClose } from './login-agent';
import { launchAcpProcess } from './process';
import type { AcpResourceInput } from './resource-types';
export const createProtocolLoginAgentOpener =
  (
    input: AcpResourceInput & { terminalSupported?: boolean } = {},
  ): OpenLoginAgent =>
  async (subject, callbacks) => {
    callbacks.signal.throwIfAborted();
    const process = await (input.launchProcess ?? launchAcpProcess)(
      subject.launch,
    );
    const connection = new AcpLoginConnection({ process, callbacks, ...input });
    return initializeOrClose(connection);
  };
