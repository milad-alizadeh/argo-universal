import { parseScreenLink } from '@repo/contracts/navigation';

// The scheme the system hands to this app. It is separate from `app://app`, which serves the App's own assets.
export const externalScheme = 'argo';

const accepted = (link: string): boolean => parseScreenLink(link).ok;

// The Screen link a launch's arguments carry, as Windows and Linux hand it over; anything else is ignored.
export const screenLinkIn = (argv: readonly string[]): string | undefined =>
  argv.find(accepted);

/*
 * Screen links the system opened in this app. Only a well-formed one is kept, and it waits until the window's page
 * is listening, so a cold start loses none. The page checks it again and decides what it opens.
 */
export class LinkInbox {
  private pending: string[] = [];
  private listening = false;
  public constructor(private readonly send: (link: string) => void) {}

  public receive(link: string): boolean {
    if (!accepted(link)) return false;

    if (this.listening) this.send(link);
    else this.pending.push(link);

    return true;
  }

  public listen(): void {
    this.listening = true;
    const held = this.pending;
    this.pending = [];

    for (const link of held) this.send(link);
  }

  public stopListening(): void {
    this.listening = false;
  }
}
