import type { PromptSession } from './services/plugin-service-options';

// What a Plugin's `argo.sessions` acts reach. Sessions are built after the Plugin runtime, so the Engine attaches them later (ADR-0055).
export class SessionActs {
  private archiver: ((sessionId: string) => Promise<unknown>) | null = null;
  private prompter: PromptSession | null = null;

  public attach(acts: {
    archive: (sessionId: string) => Promise<unknown>;
    prompt: PromptSession;
  }): void {
    this.archiver = acts.archive;
    this.prompter = acts.prompt;
  }

  public readonly archive = async (sessionId: string): Promise<void> => {
    if (!this.archiver) throw new Error('Archiving Sessions is not available');

    await this.archiver(sessionId);
  };

  public readonly prompt: PromptSession = (sessionId, text, sender) => {
    if (!this.prompter) throw new Error('Prompting Sessions is not available');

    return this.prompter(sessionId, text, sender);
  };
}
