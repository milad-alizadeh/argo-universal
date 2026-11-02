import { expect, it } from 'vitest';
import { listeningAddresses } from './listening-addresses';

it('says each network the computer is on as an address and the port it answers on', () => {
  expect(
    listeningAddresses(4000, ['desk-wifi.local', 'desk-lan.local']),
  ).toEqual(['desk-wifi.local:4000', 'desk-lan.local:4000']);
});

it('says none when the computer is on no network', () => {
  expect(listeningAddresses(4000, [])).toEqual([]);
});
