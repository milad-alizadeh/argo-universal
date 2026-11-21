import { z } from 'zod';
import { PluginPath } from './manifest-fields';
import { PluginIdentifier } from './plugin-identifier';

/*
 * The states every Draft page draws (ADR-0057): loading, empty, error, signed out or refused, pending
 * and populated. One list for the Draft bar, the State menu and `argo plugin validate`.
 */
export const draftStateIds = [
  'loading',
  'empty',
  'error',
  'signed-out',
  'pending',
  'populated',
] as const;

export const DraftStateId = z.enum(draftStateIds);

export type DraftStateId = z.infer<typeof DraftStateId>;

export const draftStateLabels: Readonly<Record<DraftStateId, string>> = {
  loading: 'Loading',
  empty: 'Empty',
  error: 'Error',
  'signed-out': 'Signed out',
  pending: 'Pending',
  populated: 'Populated',
};

// The Page state key a Draft's chosen state travels under, so it is part of the Page address and each App keeps its own.
export const draftStateKey = 'draftState';

// The minimum states a Draft page does not declare, in minimum order.
export const missingDraftStates = (
  declared: readonly DraftStateId[],
): DraftStateId[] => draftStateIds.filter((id) => !declared.includes(id));

const distinct = (ids: readonly string[]): boolean =>
  new Set(ids).size === ids.length;

const Variant = z.strictObject({
  id: PluginIdentifier,
  name: z.string().trim().min(1),
});

// A region of a Draft page, named by the key of the node that draws it, with the Variants the author picks between.
const DraftRegion = z.strictObject({
  id: PluginIdentifier,
  variants: z
    .array(Variant)
    .min(1)
    .refine((variants) => distinct(variants.map(({ id }) => id)), {
      message: 'Variant ids must be unique',
    }),
});

const DraftPage = z.strictObject({
  page: PluginPath,
  states: z
    .array(DraftStateId)
    .min(1)
    .refine(distinct, { message: 'Draft states must be unique' }),
  regions: z
    .array(DraftRegion)
    .refine((regions) => distinct(regions.map(({ id }) => id)), {
      message: 'Region ids must be unique',
    })
    .optional(),
});

/*
 * The dev-only manifest key `contributes.drafts` (ADR-0057): each Loader page that is a Draft, the states
 * it draws and its regions with their Variants. `validate` refuses a shipped Plugin that still declares it.
 */
export const PluginDrafts = z
  .array(DraftPage)
  .refine((pages) => distinct(pages.map(({ page }) => page)), {
    message: 'A page may be declared as a Draft once',
  });

export type PluginDrafts = z.infer<typeof PluginDrafts>;
