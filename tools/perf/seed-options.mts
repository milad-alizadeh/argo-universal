import { z } from 'zod';

const feedRows = z.coerce
  .number()
  .pipe(z.union([z.literal(100), z.literal(1000), z.literal(10_000)]));

const sessions = z.coerce
  .number()
  .pipe(z.union([z.literal(100), z.literal(1000), z.literal(241)]));

const seedOptions = z.strictObject({
  sessions: sessions.default(241),
  feedRows: feedRows.optional(),
});

export type SeedOptions = z.input<typeof seedOptions>;

export type SeedConfiguration = z.output<typeof seedOptions>;

export function seedConfiguration(options: SeedOptions): SeedConfiguration {
  return seedOptions.parse(options);
}

export function environmentSeedOptions(): SeedOptions {
  return seedOptions.parse({
    sessions: process.env.PERF_SESSIONS,
    feedRows: process.env.PERF_FEED_ROWS,
  });
}
