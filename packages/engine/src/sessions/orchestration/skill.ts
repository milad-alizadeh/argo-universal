import { createHash } from 'node:crypto';
import type { SlashCommand } from '@repo/contracts';
import { delegatedSkill, feedRow } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { sendQueueCommand } from '../sent-prompt/queue';
import type { SessionContext } from '../session-context';
import type { SessionHandlerSources } from '../session-sources';

type SkillSources = Pick<SessionHandlerSources, 'database' | 'open'>;
type SkillOffer = typeof delegatedSkill.$inferSelect;

const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

function advertisedCommand(
  commands: SlashCommand[] | null,
  name: string,
): SlashCommand {
  const matches = commands?.filter((command) => command.name === name) ?? [];
  const [command] = matches;
  if (matches.length !== 1 || !command)
    throw conflict(
      'The destination Agent must advertise exactly one matching slash command.',
    );

  return command;
}

const conflict = (message: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message });

function originTurn(sources: SkillSources, starterId: string): string {
  const id = sources.open.context(starterId)?.activeTurnId;
  if (!id)
    throw conflict('Offer the skill from the Turn that received the request.');

  const human = sources.database
    .select({ id: feedRow.id })
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, starterId),
        eq(feedRow.turnId, id),
        eq(feedRow.sessionUpdate, 'user_message'),
      ),
    )
    .get();
  if (!human) throw conflict('The starter Turn must have a person’s Prompt.');

  return id;
}

export async function offerSkill(
  sources: SkillSources,
  {
    sessionId,
    starterId,
    name,
    arguments: args,
  }: {
    sessionId: string;
    starterId?: string;
    name: string;
    arguments: string;
  },
): Promise<Record<string, never>> {
  if (
    !starterId ||
    sources.open.queued(sessionId).startedBySessionId !== starterId
  )
    throw conflict('Offer the skill in a Session you started.');

  const originTurnId = originTurn(sources, starterId);
  const destination = sources.open.context(sessionId);
  if (!destination)
    throw conflict(
      'Open the destination Session to read its available slash commands.',
    );

  const command = advertisedCommand(destination.slashCommands, name);
  const id = digest([starterId, originTurnId, sessionId, name, args]);
  const row = {
    id,
    originTurnId,
    starterId,
    destinationId: sessionId,
    name,
    arguments: args,
    commandDigest: digest(command),
  };
  await sources.open.write({
    describe: () => 'Offer delegated native skill',
    commit: (tx) =>
      tx.insert(delegatedSkill).values(row).onConflictDoNothing().run(),
  });

  return {};
}

export function waitingSkills(
  sources: SkillSources,
  sessionId: string,
): Pick<
  SkillOffer,
  'id' | 'name' | 'arguments' | 'starterId' | 'originTurnId'
>[] {
  return sources.database
    .select({
      id: delegatedSkill.id,
      name: delegatedSkill.name,
      arguments: delegatedSkill.arguments,
      starterId: delegatedSkill.starterId,
      originTurnId: delegatedSkill.originTurnId,
    })
    .from(delegatedSkill)
    .where(
      and(
        eq(delegatedSkill.destinationId, sessionId),
        eq(delegatedSkill.dispatched, false),
      ),
    )
    .all();
}

const invocationText = ({ name, arguments: args }: SkillOffer): string =>
  args ? `/${name} ${args}` : `/${name}`;

function requireCommand(
  row: SkillOffer,
  context: Pick<SessionContext, 'slashCommands'>,
): void {
  if (
    digest(advertisedCommand(context.slashCommands, row.name)) !==
    row.commandDigest
  )
    throw conflict(
      'The destination slash command changed. Ask the starter to offer it again.',
    );
}

function readOffer(
  database: SkillSources['database'],
  sessionId: string,
  offerId: string,
): SkillOffer {
  const row = database
    .select()
    .from(delegatedSkill)
    .where(
      and(
        eq(delegatedSkill.id, offerId),
        eq(delegatedSkill.destinationId, sessionId),
      ),
    )
    .get();

  if (!row) throw conflict('This skill offer is unavailable.');

  return row;
}

const confirming = new Set<string>();

export async function confirmSkill(
  sources: SkillSources,
  { sessionId, offerId }: { sessionId: string; offerId: string },
): Promise<Record<string, never>> {
  if (confirming.has(offerId))
    throw conflict('This skill is already being confirmed.');
  confirming.add(offerId);
  try {
    const actor = await sources.open.ready(sessionId, 'session.queue');
    sources.open.admit();
    const row = readOffer(sources.database, sessionId, offerId);
    if (row.dispatched) return {};

    requireCommand(row, actor.getSnapshot().context);
    await sendQueueCommand(actor, {
      command: {
        action: 'append',
        prompt: [{ type: 'text', text: invocationText(row) }],
      },
      sender: {
        type: 'skill',
        title: 'Confirmed skill',
        offerId,
        sessionId: row.starterId,
        originTurnId: row.originTurnId,
      },
      queuedId: `skill:${offerId}`,
      commitWith: {
        describe: () => 'Confirm delegated native skill',
        commit: (tx) =>
          tx
            .update(delegatedSkill)
            .set({ dispatched: true })
            .where(eq(delegatedSkill.id, offerId))
            .run(),
      },
    });
    return {};
  } finally {
    confirming.delete(offerId);
  }
}

export function requireConfirmedSkill(
  context: Pick<SessionContext, 'sessionId' | 'slashCommands'> & {
    input: Pick<SessionContext['input'], 'database'>;
  },
  offerId: string,
  text: string | undefined,
): void {
  const row = readOffer(context.input.database, context.sessionId, offerId);
  requireCommand(row, context);
  if (!row.dispatched || text !== invocationText(row))
    throw conflict(
      'The confirmed native command changed. Confirm a fresh skill offer.',
    );
}
