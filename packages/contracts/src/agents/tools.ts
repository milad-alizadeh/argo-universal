import { z } from 'zod';

// A tool an Agent's distribution needs to install: Node.js and npm for npx, uv for uvx.
export const InstallTool = z.enum(['node', 'uv']);

export type InstallTool = z.infer<typeof InstallTool>;

// Which tools the Resolver found on the Server's PATH; Homebrew can install the others.
export const MachineTools = z.strictObject({
  node: z.boolean(),
  uv: z.boolean(),
  brew: z.boolean(),
});

export type MachineTools = z.infer<typeof MachineTools>;

export const ToolInstallInput = z.strictObject({ tool: InstallTool });

export type ToolInstallInput = z.infer<typeof ToolInstallInput>;
