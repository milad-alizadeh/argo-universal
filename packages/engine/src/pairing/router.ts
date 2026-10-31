import {
  MintedPairingTicket,
  PairingRegistration,
  type PairingInvite,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { forgetPairedDevice } from '../devices/paired-device';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
  type RpcConnection,
} from '../rpc';
import type { WriterActorRef } from '../storage';
import type { PairingRegistrations } from './registrations';
import type { MintedTicket, PairingTickets } from './tickets';

export interface PairingDeps {
  readonly tickets: PairingTickets;
  readonly registrations: PairingRegistrations;
  readonly databaseWriter: WriterActorRef;
  readonly serverPublicKey: string;
  // What an App lists this Server by, and what a paired Device re-resolves to an address on each connect.
  readonly discoveryName: string;
}

const Declined = z.strictObject({ deviceId: z.string() });

const inviteFor = (deps: PairingDeps, minted: MintedTicket): PairingInvite => ({
  key: deps.serverPublicKey,
  server: deps.discoveryName,
  ticket: minted.ticket,
});

const mintedTicket = (deps: PairingDeps): MintedPairingTicket => {
  const minted = deps.tickets.mint();

  return {
    invite: inviteFor(deps, minted),
    expiresAt: new Date(minted.expiresAt).toISOString(),
  };
};

// A subscription needs something that says when the App has gone, or the stream it opens outlives the sheet that asked for it.
function requireConnection(
  connection: RpcConnection | undefined,
): RpcConnection {
  if (!connection)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Watching for a Device needs a live App Connection',
    });

  return connection;
}

/*
 * `mint` is the only way a Pairing Ticket comes into being: the pair sheet asks for one while the owner is watching it, and the Server hands out exactly that one (ADR-0045).
 * `revoke` is the sheet closing, so what it put on screen stops working at once rather than outliving the owner's attention by up to two minutes.
 */
const ticketRouter = routerFactory((deps: PairingDeps) =>
  router({
    mint: publicProcedure
      .output(MintedPairingTicket)
      .mutation((): MintedPairingTicket => mintedTicket(deps)),
    revoke: publicProcedure.output(z.void()).mutation((): void => {
      deps.tickets.revoke();
      deps.registrations.clear();
    }),
  }),
);

/*
 * `registered` is the Devices that have registered while the sheet has been open, which it draws as "<name> wants to pair". Each has already authenticated with its own Device Key; what it claims about itself is untrusted, and shown only so that the owner recognises it.
 * `decline` is the owner answering that prompt with No: the Device's row goes, so it reaches nothing on its next connect and has no Ticket left to pair with again.
 */
const deviceRouter = routerFactory((deps: PairingDeps) =>
  router({
    registered: publicProcedure
      .output(zAsyncIterable({ yield: PairingRegistration }))
      .subscription(async function* ({ signal, ctx }) {
        const connection = requireConnection(ctx.connection);
        yield* deps.registrations.stream(signal ?? connection.signal);
      }),
    decline: publicProcedure
      .input(Declined)
      .output(z.void())
      .mutation(async ({ input }): Promise<void> => {
        await forgetPairedDevice(deps.databaseWriter, input.deviceId);
      }),
  }),
);

/*
 * Minting on demand is what makes possession of a live Ticket the owner's consent, since nothing else can ask for one, and it is why the "wants to pair" prompt belongs with the open sheet rather than with the handshake.
 *
 * Server Device only (ADR-0022, ADR-0045): deciding who may reach the Server is the owner's alone, so none of these is an Operation and none has a tier. The Server's own refusal is `serverDeviceProcedure` in #1497, which swaps in here.
 */
export const createPairingRouter = routerFactory((deps: PairingDeps) =>
  mergeRouters(ticketRouter(deps), deviceRouter(deps)),
);
