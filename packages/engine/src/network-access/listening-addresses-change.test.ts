import { networkInterfaces } from 'node:os';
import { expect, it, vi } from 'vitest';
import { listeningAddresses } from './listening-addresses';

vi.mock('node:os', () => ({ networkInterfaces: vi.fn() }));

const on = (address: string): ReturnType<typeof networkInterfaces> => ({
  en0: [
    {
      address,
      family: 'IPv4',
      internal: false,
      netmask: '',
      mac: '',
      cidr: null,
    },
  ],
});

const lan = (last: number): string => `192.168.1.${last}`;

it('reads the computer’s networks on every call, so a Ticket minted after a move names the new address', () => {
  vi.mocked(networkInterfaces).mockReturnValueOnce(on(lan(10)));
  const first = listeningAddresses(4000);
  vi.mocked(networkInterfaces).mockReturnValueOnce(on(lan(20)));
  const second = listeningAddresses(4000);

  expect([first, second]).toEqual([[`${lan(10)}:4000`], [`${lan(20)}:4000`]]);
});
