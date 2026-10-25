import { z } from 'zod';
import { validateAccountCapabilities } from './account-manifest';
import { AccountHost, PluginCapability } from './capabilities';
import { HookEventName } from './hooks';
import { materialSymbolNames } from './material-symbol-names.gen';
import { PluginIdentifier, PluginSettingsSchema } from './plugin-settings';
import { PluginStatus } from './runtime';
import { sfSymbolNames } from './sf-symbol-names.gen';
import { SlotId } from './wire';

export { PluginProjectInfo } from './argo-calls';

// Zod's default enum error would print every name in the list.
const notIn =
  (catalogue: string) =>
  ({ input }: { input: unknown }): string =>
    `${String(input)} is not in ${catalogue}`;

const sfSymbol = z.enum(sfSymbolNames, { error: notIn('SF Symbols 6.0') });

const materialSymbol = z.enum(materialSymbolNames, {
  error: notIn('Material Symbols'),
});

// A Plugin targets iOS and macOS, Android and the web, or both, so either name may be missing (ADR-0025).
export const PluginIcon = z
  .strictObject({
    sf: sfSymbol.optional(),
    sfFilled: sfSymbol.optional(),
    material: materialSymbol.optional(),
  })
  .refine(
    (icon) => icon.sf !== undefined || icon.material !== undefined,
    'icon needs an sf or a material name',
  )
  .refine(
    (icon) => icon.sfFilled === undefined || icon.sf !== undefined,
    'icon.sfFilled needs an sf name',
  );

export type PluginIcon = z.infer<typeof PluginIcon>;

const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);

export const PluginManifest = z
  .strictObject({
    id: PluginIdentifier,
    name: z.string().trim().min(1),
    version: z.string().min(1),
    engines: z.strictObject({ argo: z.string().trim().min(1) }),
    // A TypeScript entry is bundled by esbuild as a dev Plugin's is (ADR-0025).
    main: z
      .string()
      .regex(
        /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:js|mjs|cjs|ts|tsx)$/,
      ),
    icon: PluginIcon,
    contributes: z
      .strictObject({
        accounts: z
          .array(
            z.strictObject(
              { host: AccountHost, page: PluginPath },
              {
                error: ({ input }) =>
                  typeof input === 'string'
                    ? `Account ${input} must declare { host, page } and its verbatim fetch Capability`
                    : 'Account must declare { host, page }',
              },
            ),
          )
          .optional(),
        nav: z
          .array(
            z.strictObject({
              id: PluginIdentifier,
              title: z.string().trim().min(1),
              path: PluginPath,
            }),
          )
          .refine(
            (items) =>
              new Set(items.map((item) => item.id)).size === items.length,
            'Nav ids must be unique',
          ),
        settings: PluginSettingsSchema.optional(),
        background: z
          .strictObject({
            path: PluginPath,
            interval: z.number().finite().nonnegative(),
          })
          .optional(),
        // The Slots the Plugin fills; core asks only these Plugins for a Slot's content.
        slots: z
          .array(SlotId)
          .refine(
            (slots) => new Set(slots).size === slots.length,
            'Slot ids must be unique',
          )
          .optional(),
        // The core events the Plugin hooks; its worker starts when one fires (ADR-0027).
        hooks: z
          .array(HookEventName)
          .refine(
            (events) => new Set(events).size === events.length,
            'Hook events must be unique',
          )
          .optional(),
        // Where the Plugin's `ui.render` Hooks sit in a Replaceable Slot's chain: lower runs first, 0 when left out (ADR-0035).
        renderOrder: z.int().optional(),
      })
      .refine(
        (contributes) =>
          contributes.renderOrder === undefined ||
          (contributes.hooks ?? []).includes('ui.render'),
        {
          message: 'renderOrder needs the ui.render Hook',
          path: ['renderOrder'],
        },
      ),
    capabilities: z.array(PluginCapability).optional(),
  })
  .superRefine(validateAccountCapabilities);

export type PluginManifest = z.infer<typeof PluginManifest>;

export const PluginActivation = z.object({ pluginId: PluginIdentifier });

export const PluginList = z.object({
  plugins: z.array(
    z.object({
      manifest: PluginManifest,
      firstParty: z.boolean(),
      enabled: z.boolean(),
      ...PluginStatus.shape,
    }),
  ),
  errors: z.array(z.object({ directory: z.string(), message: z.string() })),
});

export type PluginList = z.infer<typeof PluginList>;

export {
  HookEventName,
  hookEvents,
  type HookAnswer,
  type HookEvent,
  type CoreHooks,
} from './hooks';

export {
  PluginCapability,
  isRefusedVariable,
  isSpecialHost,
  sameHost,
  type FetchCapability,
  type ProcessCapability,
} from './capabilities';

export {
  PluginEnablement,
  PluginSettingChange,
  PluginSettingField,
  PluginSettings,
  PluginSettingsSchema,
  PluginSettingValue,
  PluginStateRecord,
} from './plugin-settings';
