import { z } from 'zod';
import type { Catalog } from './catalog.mts';
import { bindingSchema, registrySchema, type Registry } from './model.mts';
import type { SnapshotReader } from './snapshot-reader.mts';

const exclusionSchema = z.object({
  fileId: z.string(),
  nodeId: z.string(),
  name: z.string(),
  reason: z.string(),
  location: bindingSchema.shape.location,
});

export const enrollmentSchema = z.object({
  registry: registrySchema,
  excluded: z.array(exclusionSchema),
  rebindings: z.array(z.object({ from: bindingSchema, to: bindingSchema })),
});

export type Exclusion = z.infer<typeof exclusionSchema>;

export type Enrollment = z.infer<typeof enrollmentSchema>;

export type EnrollmentContext = {
  catalog: Catalog;
  previous: Registry;
  reader: SnapshotReader;
  result: Enrollment;
  rebind: boolean;
};
