import { z } from 'zod';
import { IconName } from './icons.gen';

const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);

const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);

export const PluginManifest = z.strictObject({
  id: PluginIdentifier,
  name: z.string().trim().min(1),
  version: z.string().min(1),
  engines: z.strictObject({ argo: z.string().trim().min(1) }),
  main: z
    .string()
    .regex(
      /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:js|mjs|cjs)$/,
    ),
  icon: IconName,
  contributes: z.strictObject({
    nav: z
      .array(
        z.strictObject({
          id: PluginIdentifier,
          title: z.string().trim().min(1),
          path: PluginPath,
        }),
      )
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        'Nav ids must be unique',
      ),
  }),
});

export type PluginManifest = z.infer<typeof PluginManifest>;

export const PluginList = z.object({
  plugins: z.array(
    z.object({
      manifest: PluginManifest,
      firstParty: z.boolean(),
      enabled: z.boolean(),
    }),
  ),
  errors: z.array(z.object({ directory: z.string(), message: z.string() })),
});

export type PluginList = z.infer<typeof PluginList>;
