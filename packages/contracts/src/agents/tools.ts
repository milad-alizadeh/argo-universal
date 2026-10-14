import { z } from 'zod';

// Which tools an Agent's distribution needs that the Resolver found on the Server's PATH: Node.js and npm for npx, uv for uvx. Argo never installs them.
export const MachineTools = z.strictObject({
  node: z.boolean(),
  uv: z.boolean(),
});

export type MachineTools = z.infer<typeof MachineTools>;
