import type { DraftChoice } from '@repo/contracts/operations/plugin-drafts';
import { draftChoiceRefusal } from '@repo/contracts/plugins/drafts';
import { TRPCError } from '@trpc/server';
import type { Sessions } from '../../sessions';
import {
  locatePlugin,
  pluginLocation,
  type PluginServiceDeps,
} from '../located-plugins';
import { draftPrompt } from './draft-prompt';
import type { ChosenDraft, PluginDrafts } from './plugin-drafts';

// What Draft review asks of Sessions: send a Prompt as the Plugin whose Draft it is (ADR-0055).
export type DraftSessions = Pick<Sessions, 'promptFromPlugin'>;

export type ChosenDraftOf = ChosenDraft & { pluginId: string };

// Draft review (ADR-0057): which Session draws a dev Plugin's Draft, the author's choice, and the Prompt that carries it back.
export class DraftReview {
  constructor(
    private readonly deps: PluginServiceDeps,
    private readonly store: PluginDrafts,
  ) {}

  // Rebuilds a dev Plugin at once; a build that fails keeps the worker and is the refusal.
  async show(
    pluginId: string,
    region?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.activate(pluginId);

    // The Session that draws is the one the author's Choose answers to.
    if (sessionId) await this.store.drawnBy(pluginId, sessionId);

    // The mark of the worker this swaps in names the region, so Apps frame it (ADR-0057).
    const done = this.deps.pluginRuntime.changes.drawing(pluginId, region);

    try {
      const error = await this.deps.pluginRuntime.showDraft(pluginId);

      if (error) throw new Error(error);

      // Answered once the new worker reports, so the Agent's next step sees the Draft drawn.
      const status = await this.activate(pluginId);

      if (status.state !== 'running')
        throw new Error(status.error ?? 'Plugin did not start');
    } finally {
      done();
    }
  }

  // Records the author's choice and hands it to the Session whose Agent draws the Draft.
  async choose(
    { pluginId, ...chosen }: ChosenDraftOf,
    sessions: DraftSessions,
  ): Promise<{ sessionId: string; delivery: 'started' | 'queued' }> {
    const { name, contributes } = await locatePlugin(this.deps, pluginId).then(
      ({ plugin }) => plugin.manifest,
    );

    if (this.deps.dev !== true)
      throw new Error(`${pluginId} is not a dev Plugin, so it has no Draft`);

    const refusal = draftChoiceRefusal(
      contributes.drafts,
      chosen.picks,
      chosen.comments,
    );

    if (refusal) throw new TRPCError({ code: 'CONFLICT', message: refusal });

    const sessionId = this.store.sessionOf(pluginId);

    if (!sessionId)
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `No Session is drawing ${pluginId}'s Draft: its Agent runs plugin.draft.show from its Session first.`,
      });

    await this.store.choose(pluginId, chosen);

    const sent = await sessions.promptFromPlugin(
      {
        sessionId,
        prompt: [
          {
            type: 'text',
            text: draftPrompt({ pluginId, title: name }, chosen),
          },
        ],
      },
      { type: 'plugin', pluginId, title: name },
    );

    return { sessionId, delivery: sent.status };
  }

  // What the author last chose, read back by the Agent (also after a restart).
  pick(pluginId: string): DraftChoice | null {
    return this.store.choice(pluginId);
  }

  private async activate(
    pluginId: string,
  ): ReturnType<PluginServiceDeps['pluginRuntime']['activate']> {
    return this.deps.pluginRuntime.activate(
      await pluginLocation(this.deps, pluginId),
    );
  }
}
