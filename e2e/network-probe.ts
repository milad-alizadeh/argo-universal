import { connect, type Socket } from 'node:net';
import { networkInterfaces } from 'node:os';

const probeTimeoutMs = 2_000;

// Whether anything accepts a TCP connection at `host:port`.
export function accepts(host: string, port: number): Promise<boolean> {
  return new Promise<boolean>((resolve): void => {
    const socket: Socket = connect({ host, port });

    const settle = (answer: boolean): void => {
      socket.destroy();
      resolve(answer);
    };

    socket.setTimeout(probeTimeoutMs, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

// Every IPv4 address of this computer that is not loopback, whatever the interface is called.
const networkAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
    .map((entry) => entry?.address ?? '');

const noAddressMessage =
  'This computer has no network address beyond loopback, so a Server bound beyond loopback cannot be reached';

const unansweredMessage = (candidates: string[]): string =>
  `The Server did not answer on any of this computer's addresses (${candidates.join(', ')}) with Local network access on`;

const answering = async (
  candidates: string[],
  port: number,
): Promise<string | undefined> => {
  for (const address of candidates)
    if (await accepts(address, port)) return address;

  return undefined;
};

/*
 * An address another Device could use to reach the Server, found by asking the Server rather than by naming an interface: a computer can hold several (Wi-Fi, Ethernet, a VPN such as Tailscale, a container bridge) and the first one is not always the one that answers.
 * Fails, rather than skipping, on a computer with none, because then the journey has proved nothing.
 */
export async function addressBeyondLoopback(port: number): Promise<string> {
  const candidates = networkAddresses();
  const address = await answering(candidates, port);

  if (address) return address;

  throw new Error(
    candidates.length === 0 ? noAddressMessage : unansweredMessage(candidates),
  );
}
