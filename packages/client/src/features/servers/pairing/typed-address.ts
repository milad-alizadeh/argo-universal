import { z } from 'zod';
import type { ServerAddress } from '#features/connection';

const highestPort = 65_535;

const addressOf = (text: string): ServerAddress => {
  const colon = text.lastIndexOf(':');

  return { host: text.slice(0, colon), port: Number(text.slice(colon + 1)) };
};

// A host with no colon in it, then a port of one to five digits that does not begin with zero.
const TypedAddress = z
  .string()
  .trim()
  .regex(/^[^\s:]+:[1-9]\d{0,4}$/)
  .transform(addressOf)
  .refine(({ port }) => port <= highestPort);

/*
 * The address an owner typed as `host:port`, such as the one the Server Device shows beside its code, or nothing when it is not one: a name or an address with no port is a hint for discovery, not a place to knock.
 */
export const readTypedAddress = (
  typed: string | undefined,
): ServerAddress | undefined => TypedAddress.safeParse(typed).data;
