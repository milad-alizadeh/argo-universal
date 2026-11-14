// What a Plugin's `argo.sessions` acts reach. Sessions are built after the Plugin runtime, so the Engine attaches its archive later (ADR-0055).
export class SessionActs {
  private archiver: ((sessionId: string) => Promise<unknown>) | null = null;

  public attach(acts: {
    archive: (sessionId: string) => Promise<unknown>;
  }): void {
    this.archiver = acts.archive;
  }

  public readonly archive = async (sessionId: string): Promise<void> => {
    if (!this.archiver) throw new Error('Archiving Sessions is not available');

    await this.archiver(sessionId);
  };
}
