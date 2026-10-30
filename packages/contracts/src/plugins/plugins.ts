import { z } from 'zod';
import { validateAccountCapabilities } from './account-manifest';
import { AccountHost, PluginCapability } from './capabilities';
import { DeclaredContributions } from './declared-slots';
import { HookEventName } from './hooks';
import { PluginIcon, PluginPath } from './manifest-fields';
import { PluginOperationContributions } from './plugin-operations';
import { PluginIdentifier, PluginSettingsSchema } from './plugin-settings';
import { PluginStatus } from './runtime';
import { AddOnlySlotId, ReplaceableSlotId } from './wire';

export { PluginProjectInfo } from './argo-calls';

export { PluginIcon } from './manifest-fields';

function uniqueIds<Id extends z.ZodType<string>>(
  id: Id,
  message: string,
): z.ZodArray<Id> {
  return z.array(id).refine((ids) => new Set(ids).size === ids.length, message);
}

type Contributions = Partial<{
  order: number | undefined;
  slots: readonly string[] | undefined;
  renders: readonly string[] | undefined;
  hooks: readonly string[] | undefined;
  declared:
    | Readonly<Record<string, readonly unknown[] | undefined>>
    | undefined;
}>;

const declares = (ids: readonly unknown[] | undefined): boolean =>
  (ids ?? []).length > 0;

const fillsASlot = ({
  slots,
  renders,
  declared = {},
}: Contributions): boolean =>
  [slots, renders, ...Object.values(declared)].some(declares);

// `order` places the Plugin among a Slot's contributors, so it needs a Slot to place it in.
const orderHasSlot = (contributions: Contributions): boolean =>
  contributions.order === undefined || fillsASlot(contributions);

// Core runs a Replaceable Slot's chain through the `ui.render` Hook, so `renders` needs it.
const rendersHasHook = ({ renders, hooks }: Contributions): boolean =>
  !declares(renders) || (hooks ?? []).includes('ui.render');

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
        // The add-only Slots the Plugin fills; core asks only these Plugins for a Slot's content.
        slots: uniqueIds(AddOnlySlotId, 'Slot ids must be unique').optional(),
        // What the Plugin adds to a declared Slot, such as Session header actions, by Slot id; the App draws it without starting the Plugin (ADR-0035).
        declared: DeclaredContributions.optional(),
        // The Replaceable Slots the Plugin's `ui.render` Hook draws; core runs its chain only for these (ADR-0035).
        renders: uniqueIds(
          ReplaceableSlotId,
          'Replaceable Slot ids must be unique',
        ).optional(),
        // The core events the Plugin hooks; its worker starts when one fires (ADR-0027).
        hooks: uniqueIds(
          HookEventName,
          'Hook events must be unique',
        ).optional(),
        // The Operations the Plugin adds to the registry, which an Agent runs with `argo run <plugin-id>.<name>` (ADR-0044).
        operations: PluginOperationContributions.optional(),
        // Where the Plugin sits among a Slot's contributors and in a Replaceable Slot's `ui.render` chain: lower comes first, 0 when left out (ADR-0035).
        order: z.int().optional(),
      })
      .refine(orderHasSlot, {
        message: 'order needs a Slot',
        path: ['order'],
      })
      .refine(rendersHasHook, {
        message: 'renders needs the ui.render Hook',
        path: ['renders'],
      }),
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
