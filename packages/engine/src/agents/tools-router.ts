import { MachineTools } from '@repo/contracts';
import { publicProcedure, router } from '../rpc';
import { lookForTools } from './resolver/machine-tools';

// Which install tools are on this machine; Argo never installs them.
export const toolsRouter = router({
  tools: publicProcedure.output(MachineTools).query(() => lookForTools()),
});
