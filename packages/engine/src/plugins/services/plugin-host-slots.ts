// How many requests one Plugin has open to one host at once; the rest wait their turn (#2197).
export const concurrentPerHostLimit = 6;

// How many commands one Plugin runs at once; a `gh` read per pull request must not start a process per pull request.
export const concurrentCommandLimit = 6;

type Host = { open: number; waiting: (() => void)[] };

/*
 * A turn at each host's cap. `run` starts the work when fewer than the cap are open to that host and holds it
 * otherwise, so a Plugin that asks for twenty pull requests at once sends the host six at a time without writing
 * any throttling of its own.
 */
export class HostSlots {
  constructor(private readonly limit = concurrentPerHostLimit) {}

  private readonly hosts = new Map<string, Host>();

  async run<T>(host: string, work: () => Promise<T>): Promise<T> {
    await this.take(host);

    try {
      return await work();
    } finally {
      this.give(host);
    }
  }

  private take(host: string): Promise<void> {
    const state = this.hosts.get(host) ?? { open: 0, waiting: [] };

    this.hosts.set(host, state);

    if (state.open < this.limit) {
      state.open += 1;

      return Promise.resolve();
    }

    return new Promise((resolve) => state.waiting.push(resolve));
  }

  // The turn goes straight to the next in line, so the host never sees more than the cap.
  private give(host: string): void {
    const state = this.hosts.get(host);
    const next = state?.waiting.shift();

    if (next) next();
    else this.close(host);
  }

  // Nobody is waiting: the turn is free, and a host with none open is forgotten.
  private close(host: string): void {
    const state = this.hosts.get(host);

    if (!state) return;

    state.open -= 1;

    if (state.open === 0) this.hosts.delete(host);
  }
}
