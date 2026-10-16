import { describe, expect, it } from 'vitest';
import type { ErrorToast } from '#primitives/overlays/toast';
import {
  dropped,
  openFailure,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import { droppedConnectionToast, signInReadToast } from './session-toasts';

const couldNotOpen = "Couldn't open the Session";

const refusedOpen = openFailure({ type: 'failed', message: 'Agent exited' });

const droppedToast = (title: string): ErrorToast => ({
  title,
  message: 'WebSocket closed',
  key: 'connection-dropped',
});

describe('droppedConnectionToast', () => {
  it.each([
    {
      case: 'an open that never happened',
      sources: { opens: [dropped] },
      title: couldNotOpen,
    },
    {
      case: 'a Retry the Connection dropped',
      sources: { opens: [dropped], feed: null, opened: false },
      title: couldNotOpen,
    },
    {
      case: 'the Feed of a Session that never opened',
      sources: { opens: [null], feed: dropped, opened: false },
      title: couldNotOpen,
    },
    {
      case: 'the Feed of an open Session',
      sources: { opens: [null], feed: dropped, opened: true },
      title: 'Connection lost',
    },
  ])('says why for $case', ({ sources, title }) => {
    expect(droppedConnectionToast(sources)).toEqual(droppedToast(title));
  });

  // The toast's one key keeps a second drop, shown or not, from showing another.
  it('shows one toast when the Feed and a Retry drop together', () => {
    expect(
      droppedConnectionToast({ opens: [dropped], feed: dropped, opened: true }),
    ).toEqual(droppedToast(couldNotOpen));
  });

  it.each([
    { case: 'a refused open', sources: { opens: [refusedOpen] } },
    {
      case: 'a Feed closed on a launch failure',
      sources: { opens: [null], feed: refusedOpen, opened: true },
    },
    { case: 'a Server error', sources: { opens: [serverError] } },
    { case: 'no error', sources: { opens: [undefined], feed: null } },
  ])('leaves $case to the callout', ({ sources }) => {
    expect(droppedConnectionToast(sources)).toBeUndefined();
  });
});

describe('signInReadToast', () => {
  it('says the sign-in could not be checked, and why', () => {
    expect(signInReadToast(serverError)).toEqual({
      title: "Couldn't check sign-in",
      message: serverError.message,
    });
  });

  it('shows nothing while the read is fine', () => {
    expect(signInReadToast(null)).toBeUndefined();
  });
});
