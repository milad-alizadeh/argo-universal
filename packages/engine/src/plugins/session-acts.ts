import type {
  PromptSession,
  WithdrawPrompt,
} from './services/plugin-service-options';

// What a Plugin's `argo.sessions` acts reach. Sessions are built after the Plugin runtime, so the Engine attaches them later (ADR-0055).
export class SessionActs {
  private archiver: ((sessionId: string) => Promise<void>) | null = null;
  private prompter: PromptSession | null = null;
  private withdrawer: WithdrawPrompt | null = null;

  public attach(acts: {
    archive: (sessionId: string) => Promise<void>;
    prompt: PromptSession;
    withdraw: WithdrawPrompt;
  }): void {
    this.archiver = acts.archive;
    this.prompter = acts.prompt;
    this.withdrawer = acts.withdraw;
  }

  public readonly archive = async (sessionId: string): Promise<void> => {
    if (!this.archiver) throw new Error('Archiving Sessions is not available');

    await this.archiver(sessionId);
  };

  public readonly prompt: PromptSession = (sessionId, text, sender) => {
    if (!this.prompter) throw new Error('Prompting Sessions is not available');

    return this.prompter(sessionId, text, sender);
  };

  public readonly withdraw: WithdrawPrompt = (sessionId, queuedId, sender) => {
    if (!this.withdrawer)
      throw new Error('Withdrawing Prompts is not available');

    return this.withdrawer(sessionId, queuedId, sender);
  };
}
