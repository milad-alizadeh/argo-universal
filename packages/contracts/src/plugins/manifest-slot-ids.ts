import { z } from 'zod';
import { uniqueIds } from './unique-ids';
import { AddOnlySlotId } from './wire';

/*
 * Slots Argo no longer has, which a Plugin written before may still declare: a Session row's Activity line was one.
 * The manifest drops them, so the Plugin still loads and is never asked for them.
 */
const retiredSlotIds = new Set(['argo/session/activity/v1']);

// The add-only Slots a manifest declares, each at most once, with the retired ones left out.
export const ManifestSlotIds = z
  .array(z.string())
  .transform((ids) => ids.filter((id) => !retiredSlotIds.has(id)))
  .pipe(uniqueIds(AddOnlySlotId, 'Slot ids must be unique'));
