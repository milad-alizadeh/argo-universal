import { expect, it } from 'vitest';
import { startHookTest as start, promptEvent } from '../mocks/hook-fixture';

const promptSubmit = 'prompt.submit';

const skippedPrompt = 'skipped prompt.submit';

it('stops the outer Hook budget only while next runs and resumes it afterwards', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', async (ctx, event, next) => {
      await argo.settings.get('outer');
      await new Promise(resolve => setTimeout(resolve, 900));
      const answer = await next();
      await new Promise(resolve => setTimeout(resolve, 900));
      return { prompt: [{ type: 'text', text: 'Outer completed' }] };
    });
    await argo.on('prompt.submit', async (ctx, event, next) => {
      await new Promise(resolve => setTimeout(resolve, 1900));
      return next();
    });
  }`);

  let answer: unknown;

  const emitted = kit.emit(promptSubmit, promptEvent).then((value) => {
    answer = value;
  });

  await expect.poll(() => kit.log()).toContain('argo.settings.get outer');
  await kit.clock.advance(3699);
  expect(answer).toBeUndefined();
  await kit.clock.advance(1);
  await emitted;
  expect(answer).toEqual({
    prompt: [{ type: 'text', text: 'Outer completed' }],
  });
  expect(await kit.log()).not.toContain('ms budget');
});

it('keeps next as the commit point and drops a late refusal after it', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', async (ctx, event, next) => {
      await next({ ...event, prompt: [{ type: 'text', text: 'Committed' }] });
      await argo.settings.get('committed');
      await new Promise(resolve => setTimeout(resolve, 2100));
      return { drop: 'Late refusal' };
    });
  }`);

  const emitted = kit.emit(promptSubmit, promptEvent);
  await expect.poll(() => kit.log()).toContain('argo.settings.get committed');
  await kit.clock.advance(2000);
  expect(await emitted).toEqual({
    prompt: [{ type: 'text', text: 'Committed' }],
  });
  await kit.clock.advance(100);
  expect(
    (await kit.log())
      .split('\n')
      .filter((line) => line.includes(skippedPrompt)),
  ).toHaveLength(1);
});

it('drops a late rewrite and prevents next from running the chain twice', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', async (ctx, event, next) => {
      await argo.settings.get('entered');
      await new Promise(resolve => setTimeout(resolve, 2100));
      return next({ ...event, prompt: [{ type: 'text', text: 'Late rewrite' }] });
    });
    await argo.on('prompt.submit', async (ctx, event, next) => {
      await argo.storage.execute({ sql: 'INSERT INTO visits VALUES (1)', params: [], method: 'run' });
      return next();
    });
  }`);

  kit.storage.execute([
    { sql: 'CREATE TABLE visits (value INTEGER)', params: [], method: 'run' },
  ]);
  const emitted = kit.emit(promptSubmit, promptEvent);
  await expect.poll(() => kit.log()).toContain('argo.settings.get entered');
  await kit.clock.advance(2000);
  expect(await emitted).toEqual({ prompt: promptEvent.prompt });
  await kit.clock.advance(100);
  expect(
    kit.storage.execute([
      { sql: 'SELECT COUNT(*) FROM visits', params: [], method: 'all' },
    ]),
  ).toMatchObject([{ rows: [[1]] }]);
});
