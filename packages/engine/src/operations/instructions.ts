import type { PluginInstruction } from '@repo/contracts/operations/control';
import type { OperationsDeps } from './operations';
import { authenticate } from './tokens';

type InstructionDeps = Pick<OperationsDeps, 'controlToken' | 'sessionTokens'>;

// The Plugin instructions the MCP launcher fetches once per Session; the user's token or a live Session's reads them.
export class OperationInstructions {
  public constructor(
    private readonly deps: InstructionDeps,
    private readonly plugins: {
      instructions: () => Promise<PluginInstruction[]>;
    },
  ) {}

  public read(token: string | undefined): Promise<PluginInstruction[]> {
    authenticate(this.deps, token);

    return this.plugins.instructions();
  }
}
