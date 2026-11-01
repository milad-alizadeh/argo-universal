import {
  MintedPairingTicket,
  PairingRegistration,
  type PairingInvite,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  mergeRouters,
  router,
  routerFactory,
  serverDeviceProcedure,
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

const Answered = z.strictObject({ deviceId: z.string() });

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
    mint: serverDeviceProcedure
      .output(MintedPairingTicket)
      .mutation((): MintedPairingTicket => mintedTicket(deps)),
    revoke: serverDeviceProcedure.output(z.void()).mutation((): void => {
      deps.tickets.revoke();
      deps.registrations.clear();
    }),
  }),
);

/*
 * `registered` is the Devices that are waiting while the sheet has been open, which it draws as "<name> wants to pair". Each has proved its own Device Key and spent a Ticket; what it claims about itself is untrusted, and shown only so that the owner recognises it.
 * `allow` is the owner answering that prompt with Yes: the Device is written down and let in. `decline` is No: the Server never wrote it down, so it has no row, and its Ticket is spent.
 */
const registeredRouter = routerFactory((deps: PairingDeps) =>
  router({
    registered: serverDeviceProcedure
      .output(zAsyncIterable({ yield: PairingRegistration }))
      .subscription(({ signal, ctx }) =>
        watching(deps, signal ?? requireConnection(ctx.connection).signal),
      ),
  }),
);

const answerRouter = routerFactory((deps: PairingDeps) =>
  router({
    allow: serverDeviceProcedure
      .input(Answered)
      .output(z.void())
      .mutation(async ({ input }): Promise<void> => {
        notAsking(await deps.registrations.allow(input.deviceId));
      }),
    decline: serverDeviceProcedure
      .input(Answered)
      .output(z.void())
      .mutation(({ input }): void => {
        notAsking(deps.registrations.decline(input.deviceId));
      }),
  }),
);

const watching = (
  deps: PairingDeps,
  signal: AbortSignal,
): AsyncGenerator<PairingRegistration> => deps.registrations.stream(signal);

// An answer to a question nobody asked is not an answer: it never touches a Device the sheet is not prompting about, so it stays the prompt's own and never a way to pair or unpair whatever Device the caller can name.
function notAsking(asking: boolean): void {
  if (!asking)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'That Device is not asking to pair',
    });
}

/*
 * Minting on demand is what makes possession of a live Ticket the owner's consent, since nothing else can ask for one, and it is why the "wants to pair" prompt belongs with the open sheet rather than with the handshake.
 *
 * Server Device only (ADR-0022, ADR-0045): deciding who may reach the Server is the owner's alone, so the Server refuses every one of these to a Paired Device, and none of them is an Operation or has a tier. Letting a Paired Device pair another is the lost-phone case ADR-0022 forbids.
 */
export const createPairingRouter = routerFactory((deps: PairingDeps) =>
  mergeRouters(ticketRouter(deps), registeredRouter(deps), answerRouter(deps)),
);
