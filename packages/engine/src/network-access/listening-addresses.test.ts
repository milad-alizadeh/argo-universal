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

const lan = (last: number): string => `192.168.1.${last}`;

const cable = (last: number): string => `169.254.20.${last}`;

const tailnet = (last: number): string => `100.101.102.${last}`;

it('says the home network first and a cable last, so a phone knocks where it most likely is', () => {
  expect(listeningAddresses(4000, [cable(9), tailnet(7), lan(172)])).toEqual([
    `${lan(172)}:4000`,
    `${tailnet(7)}:4000`,
    `${cable(9)}:4000`,
  ]);
});
