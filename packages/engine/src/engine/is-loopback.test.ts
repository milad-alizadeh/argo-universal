import { expect, it } from 'vitest';
import { isLoopback } from './network-listener';

const v4 = (...parts: number[]): string => parts.join('.');

const v6 = (...groups: string[]): string => groups.join(':');

const mapped = (address: string): string => v6('', '', 'ffff', address);

it.each([
  v4(127, 0, 0, 1),
  v4(127, 8, 9, 10),
  v6('', '', '1'),
  mapped(v4(127, 0, 0, 1)),
  mapped(v4(127, 0, 0, 1)).toUpperCase(),
])('reads %s as this computer', (address) => {
  expect(isLoopback(address)).toBe(true);
});

it.each([
  v6('', '', '1234', '5678'),
  v6('', '', '1', '2'),
  v6('', '', v4(127, 0, 0, 1)),
  `1${v4(127, 0, 0, 1)}`,
  `${v4(127, 0, 0, 1)}.evil.example`,
  v4(127, 0, 0),
  v4(127, 0, 0, 256),
  `${mapped(v4(127, 0, 0, 1))}:80`,
  mapped(v4(10, 0, 0, 1)),
  v4(192, 168, 1, 5),
  '',
  undefined,
])('does not read %s as this computer', (address) => {
  expect(isLoopback(address)).toBe(false);
});
