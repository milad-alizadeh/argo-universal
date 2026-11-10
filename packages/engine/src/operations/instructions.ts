import type { PluginInstruction } from '@repo/contracts/operations/control';
import type { OperationsDeps } from './operations';
import { tokensMatch } from './tokens';

type InstructionDeps = Pick<
  OperationsDeps,
  'controlToken' | 'sessionTokens' | 'plugins'
>;

// The Plugin instructions the MCP launcher fetches once per Session; the user's token or a live Session's reads them.
export class OperationInstructions {
  public constructor(private readonly deps: InstructionDeps) {}

  public read(token: string | undefined): Promise<PluginInstruction[]> {
    if (!token || !tokensMatch(this.deps.controlToken, token))
      this.deps.sessionTokens.require(token);

    return this.deps.plugins.plugins.instructions();
  }
}
