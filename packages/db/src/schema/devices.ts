import { sql } from 'drizzle-orm';
import { integer, snakeCase, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const devicePlatforms = [
  'macos',
  'windows',
  'linux',
  'ios',
  'android',
] as const;

// The Devices this Server trusts; the Server Device's own row is made with the Server.
export const device = snakeCase.table(
  'device',
  {
    id: text().primaryKey(),
    // The Device's public key, base64url; the Server Device's is the Server's static public key.
    publicKey: text().notNull().unique(),
    name: text().notNull(),
    platform: text({ enum: devicePlatforms }).notNull(),
    serverDevice: integer({ mode: 'boolean' }).notNull().default(false),
    pairedAt: integer().notNull(),
    lastSeenAt: integer(),
  },
  (table) => [
    uniqueIndex('device_one_server_device')
      .on(table.serverDevice)
      .where(sql`${table.serverDevice} = 1`),
  ],
);
