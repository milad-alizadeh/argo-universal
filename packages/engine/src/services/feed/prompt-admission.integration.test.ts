import { expect, it } from 'vitest';
import { createActor } from 'xstate';
import { userMessageChange } from './feed-change';
import { feedMachine } from './feed-machine';

it('a Feed without an active Writer permanently rejects prompt admission', async () => {
  const committed = Promise.withResolvers<void>();
  const feed = createActor(feedMachine, {
    input: {
      sessionId: 'session',
      epoch: 1,
      maxRevision: 0,
      nextPosition: 0,
      now: Date.now,
      findWrittenRow: () => {},
    },
  }).start();
  feed.send({
    type: 'feed.change',
    turnId: 'turn',
    change: userMessageChange('turn', [{ type: 'text', text: 'Save first' }]),
    committed,
  });
  await expect(committed.promise).rejects.toThrow('Writer is unavailable');
  feed.stop();
});
