import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import { addressKey, DrawnReads } from './drawn-reads';

const at = (path: string): PageAddress => ({
  pluginId: 'tracker',
  path,
  pageState: {},
});

it('lists the addresses no Query holds, and not the ones a Query holds', () => {
  const reads = new DrawnReads();

  reads.drew(at('/queried'));
  reads.drew(at('/plain'));

  expect(
    reads.uncomparable('tracker', new Set([addressKey(at('/queried'))])),
  ).toEqual([at('/plain')]);
});

it('lists an address whose draw read the host beside a Query, until it is drawn again', () => {
  const reads = new DrawnReads();
  const held = new Set([addressKey(at('/gated'))]);

  reads.drew(at('/gated'));
  reads.hostRead(at('/gated'));
  expect(reads.uncomparable('tracker', held)).toEqual([at('/gated')]);

  reads.drew(at('/gated'));
  expect(reads.uncomparable('tracker', held)).toEqual([]);
});

it('forgets a Plugin and keeps only the addresses drawn most recently', () => {
  const reads = new DrawnReads();

  for (let index = 0; index < 205; index += 1) reads.drew(at(`/${index}`));

  const listed = reads.uncomparable('tracker', new Set());

  expect(listed).toHaveLength(200);
  expect(listed[0]).toEqual(at('/5'));

  reads.forget('tracker');
  expect(reads.uncomparable('tracker', new Set())).toEqual([]);
});
