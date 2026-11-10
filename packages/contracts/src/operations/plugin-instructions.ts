import { z } from 'zod';

// One Plugin's instructions as the MCP launcher reads them from the Server: the prose under the Plugin's name.
export const PluginInstruction = z.strictObject({
  pluginId: z.string().min(1),
  name: z.string().min(1),
  text: z.string().min(1),
});

export type PluginInstruction = z.infer<typeof PluginInstruction>;
