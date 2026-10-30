import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import { droppedChoiceToast } from './dropped-choice-toast';

const mode: SessionConfigOption = {
  type: 'select',
  configId: 'mode',
  name: 'Mode',
  category: 'mode',
  currentValue: 'default',
  options: [
    { value: 'default', name: 'Ask first' },
    { value: 'plan', name: 'Plan mode' },
  ],
};

const fastMode: SessionConfigOption = {
  type: 'boolean',
  configId: 'fast-mode',
  name: 'Fast mode',
  category: 'model_config',
  currentValue: true,
};

const options = [mode, fastMode];

const unconfirmed = 'The Server did not confirm the change.';

it('says nothing while no choice has been let go of', () => {
  expect(droppedChoiceToast([], options)).toBeUndefined();
});

it('names the option whose choice was dropped', () => {
  expect(droppedChoiceToast(['mode'], options)).toEqual({
    title: "Couldn't change Mode",
    message: unconfirmed,
  });
});

it('names a dropped switch by its own name', () => {
  expect(droppedChoiceToast(['fast-mode'], options)).toEqual({
    title: "Couldn't change Fast mode",
    message: unconfirmed,
  });
});

it('speaks of the options as a whole when several were dropped', () => {
  expect(droppedChoiceToast(['mode', 'fast-mode'], options)).toEqual({
    title: "Couldn't change the Agent's options",
    message: unconfirmed,
  });
});

// The Agent's options can be replaced while a choice waits, which leaves nothing to name.
it('speaks of the options as a whole when the dropped option is gone', () => {
  expect(droppedChoiceToast(['mode'], [fastMode])).toEqual({
    title: "Couldn't change the Agent's options",
    message: unconfirmed,
  });
});
