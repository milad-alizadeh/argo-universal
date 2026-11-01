import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { elementBytes, sidBytes } from './group';

/*
 * What a Device sends before anything else when it holds a typed code instead of a QR, so the one port can tell it from a channel and from plain HTTP. Same length as the channel's, and a different last byte.
 */
export const pakeMagic = concatBytes(new Uint8Array(1), utf8ToBytes('ARGP'));

// The Device's opening: a fresh `sid` and its element.
export const askBytes = sidBytes + elementBytes;

const tagBytes = 16;

const keyBytes = 32;

// One entry of the Server's reply: its element for one outstanding Ticket, and a status with the Server's key sealed under that Ticket's secret.
export const entryBytes = elementBytes + 1 + keyBytes + tagBytes;

// The most outstanding Tickets one reply covers. A Device checks each against its own code, so a larger number is more guesses for whoever answers the Device in the Server's place.
export const mostOffered = 4;

export const refusedReply = 0;

export const offeredReply = 1;

// What the Server says about a Ticket whose code a Device proves it holds.
export type TicketStatus = 'live' | 'spent' | 'expired';

export const statusBytes: Record<TicketStatus, number> = {
  live: 0,
  spent: 1,
  expired: 2,
};
