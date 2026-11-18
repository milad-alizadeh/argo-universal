import { z } from 'zod';
import { AgentAuthSubject } from './auth';

// How much of a Usage limit is spent. Only `budget` and `fraction` may be drawn as a percentage.
export const UsageLimitMeasure = z.discriminatedUnion('kind', [
  // A budget the service vouches for: `used` of `entitled`.
  z.strictObject({
    kind: z.literal('budget'),
    used: z.number().min(0),
    entitled: z.number().min(0),
    unit: z.enum(['requests', 'tokens', 'credits']),
  }),
  // Only the used share, 0 to 1; above 1 when overage is in use.
  z.strictObject({
    kind: z.literal('fraction'),
    used: z.number().min(0),
  }),
  // A balance for information only, never drawn as a percentage.
  z.strictObject({
    kind: z.literal('balance'),
    available: z.number(),
    unit: z.enum(['credits', 'currency']),
    currency: z.string().optional(),
  }),
  z.strictObject({ kind: z.literal('none') }),
]);

export type UsageLimitMeasure = z.infer<typeof UsageLimitMeasure>;

// One Usage limit, modelled on Copilot's quota observations: a number the Agent did not report is unknown, never zero.
export const UsageLimit = z.strictObject({
  // The Agent's own name for the limit, such as `five_hour`; with `model`, it names the limit within one Agent.
  id: z.string().min(1),
  label: z.string().min(1),
  // Set when the limit covers one model only.
  model: z.string().min(1).optional(),
  window: z.enum(['five_hour', 'day', 'week', 'month', 'other']).optional(),
  capacity: z.enum(['available', 'exhausted', 'unlimited', 'unknown']),
  measure: UsageLimitMeasure,
  resetsAt: z.iso.datetime().optional(),
  resetEstimated: z.boolean().optional(),
  overage: z
    .strictObject({
      allowed: z.boolean(),
      used: z.number().min(0).optional(),
      cap: z.number().min(0).optional(),
    })
    .optional(),
  // A reading of the plan, or the verdict the Agent got on one request.
  observed: z.enum(['snapshot', 'admission']),
  observedAt: z.iso.datetime(),
});

export type UsageLimit = z.infer<typeof UsageLimit>;

// The Agent and Project whose Usage limits are kept: the pair its sign-in is kept for.
export const UsageLimitsSubject = AgentAuthSubject;

export type UsageLimitsSubject = z.infer<typeof UsageLimitsSubject>;

// The latest Usage limits of one Agent and Project.
export const AgentUsageLimits = z.strictObject({
  limits: z.array(UsageLimit),
});

export type AgentUsageLimits = z.infer<typeof AgentUsageLimits>;
