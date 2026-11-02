// How many exchanges a Server remembers. A fresh ephemeral key per handshake means a repeat of an older one still agrees on no keys with this Server, so the memory is what names the refusal rather than what prevents it.
const remembered = 4096;

/*
 * The ephemeral public keys the Server has already seen a Device open with. Each exchange carries a fresh one, so the same key twice is the same exchange twice: someone watching the network repeating what they saw (ADR-0045).
 */
export class SeenHandshakes {
  private readonly keys = new Set<string>();

  public accept(ephemeral: Buffer): boolean {
    const key = ephemeral.toString('base64url');

    if (this.keys.has(key)) return false;
    this.forget();
    this.keys.add(key);

    return true;
  }

  private forget(): void {
    if (this.keys.size < remembered) return;
    const [oldest] = this.keys;

    if (oldest !== undefined) this.keys.delete(oldest);
  }
}
