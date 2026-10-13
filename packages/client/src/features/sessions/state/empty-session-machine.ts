import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { assign, fromPromise, setup } from 'xstate';
import type { ConfigurationChange } from '#features/composer';
import type {
  EmptySessionContext,
  EmptySessionEvent,
  EmptySessionPorts,
} from './empty-session-ports';

export type {
  EmptySessionContext,
  EmptySessionEvent,
  EmptySessionPorts,
  FirstPrompt,
} from './empty-session-ports';

const choicesChangedType = 'choices.changed';

const toHandedOff = '#emptySession.handedOff';

// Choices settle for this long before a Session opens for them.
export const choiceDebounceMs = 300;

// A Feed that never shows the prompt hands the Session on after this long anyway.
export const promptShowTimeoutMs = 3_000;

const choiceKey = (input: SessionNewInput | undefined): string | undefined =>
  input && JSON.stringify(input);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const nextChange = (
  context: EmptySessionContext,
): ConfigurationChange | undefined =>
  context.ports.nextChange(
    context.configOptions,
    context.saved,
    context.applied,
  );

const appliedOnce = (context: EmptySessionContext): string[] => [
  ...context.applied,
  nextChange(context)?.configId ?? '',
];

// New Session's real, empty Session: opened for the current choices, reopened when they change, prompted once.
export const emptySessionMachine = setup({
  types: {
    input: {} as EmptySessionPorts,
    context: {} as EmptySessionContext,
    events: {} as EmptySessionEvent,
  },
  delays: {
    choiceDebounce: choiceDebounceMs,
    promptShowTimeout: promptShowTimeoutMs,
  },
  actors: {
    open: fromPromise<{ sessionId: string }, EmptySessionContext>(
      ({ input, signal }) => {
        if (!input.input) throw new Error('No Session to open.');
        return input.ports.open(input.input, signal);
      },
    ),
    close: fromPromise<unknown, EmptySessionContext>(({ input }) =>
      input.sessionId ? input.ports.close(input.sessionId) : Promise.resolve(),
    ),
    setConfigOption: fromPromise<
      SessionConfigOption[],
      { context: EmptySessionContext; change: ConfigurationChange }
    >(({ input: { context, change } }) => {
      if (!context.sessionId) throw new Error('No Session is open.');
      return context.ports.setConfigOption(context.sessionId, change);
    }),
    prompt: fromPromise<unknown, EmptySessionContext>(({ input }) => {
      if (!input.sessionId || !input.pendingPrompt)
        throw new Error('No prompt to send.');
      return input.ports.prompt(input.sessionId, input.pendingPrompt);
    }),
  },
  guards: {
    canOpen: ({ context }) => context.connected && context.input !== undefined,
    choicesChanged: ({ context, event }) =>
      event.type === choicesChangedType &&
      choiceKey(event.input) !== context.openedKey,
    choicesOrConnectionChanged: ({ context, event }) =>
      event.type === choicesChangedType &&
      (choiceKey(event.input) !== choiceKey(context.input) ||
        event.connected !== context.connected),
    stale: ({ context }) => choiceKey(context.input) !== context.openedKey,
    hasNextChange: ({ context }) => nextChange(context) !== undefined,
    hasPendingPrompt: ({ context }) => context.pendingPrompt !== undefined,
    promptShown: ({ context }) => context.promptShown,
  },
  actions: {
    takeChoices: assign(({ event }) =>
      event.type === choicesChangedType
        ? { input: event.input, connected: event.connected }
        : {},
    ),
    queuePrompt: assign({
      pendingPrompt: ({ context, event }) =>
        event.type === 'send' ? event.prompt : context.pendingPrompt,
    }),
    rememberOpening: assign({
      openedKey: ({ context }) => choiceKey(context.input),
      error: undefined,
    }),
    forgetSession: assign({
      sessionId: undefined,
      openedKey: undefined,
      configOptions: [],
      saved: {},
      applied: [],
      promptShown: false,
    }),
    showPrompt: assign({ promptShown: true }),
    handOff: ({ context }) => {
      if (context.sessionId) context.ports.handOff(context.sessionId);
    },
  },
}).createMachine({
  id: 'emptySession',
  initial: 'waiting',
  context: ({ input }) => ({
    ports: input,
    input: undefined,
    connected: false,
    openedKey: undefined,
    sessionId: undefined,
    configOptions: [],
    saved: {},
    applied: [],
    pendingPrompt: undefined,
    promptShown: false,
    error: undefined,
  }),
  states: {
    // No Session yet: the choices settle, then one opens for them.
    waiting: {
      after: { choiceDebounce: { guard: 'canOpen', target: 'opening' } },
      on: {
        // The same choices again, as each render sends them, leave the wait running.
        'choices.changed': [
          {
            guard: 'choicesOrConnectionChanged',
            target: 'waiting',
            reenter: true,
            actions: 'takeChoices',
          },
        ],
        send: { actions: 'queuePrompt' },
      },
    },
    // A choice made while opening waits for the result, closes it, then opens again.
    opening: {
      entry: 'rememberOpening',
      invoke: {
        id: 'open',
        src: 'open',
        input: ({ context }) => context,
        onDone: {
          target: 'opened',
          actions: assign({
            sessionId: ({ event }): string => event.output.sessionId,
          }),
        },
        onError: [
          { guard: 'stale', target: 'waiting' },
          {
            target: 'failed',
            actions: assign({
              error: ({ event }): string => errorMessage(event.error),
              pendingPrompt: undefined,
            }),
          },
        ],
      },
      on: {
        'choices.changed': { actions: 'takeChoices' },
        send: { actions: 'queuePrompt' },
      },
    },
    // Choices that changed while it opened close it again.
    opened: {
      always: [{ guard: 'stale', target: 'closing' }, { target: 'open' }],
    },
    open: {
      initial: 'loading',
      on: {
        'choices.changed': [
          {
            guard: 'choicesChanged',
            target: 'closing',
            actions: 'takeChoices',
          },
          { actions: 'takeChoices' },
        ],
        send: { actions: 'queuePrompt' },
      },
      states: {
        // The Feed reads the opened Session's options.
        loading: {
          on: {
            'options.loaded': {
              target: 'applyingRemembered',
              actions: assign({
                configOptions: ({ event }) => event.configOptions,
                saved: ({ event }) => event.saved,
              }),
            },
          },
        },
        // This device's last choices for the Agent, one at a time, model before effort.
        applyingRemembered: {
          initial: 'choosing',
          states: {
            choosing: {
              always: [
                { guard: 'hasNextChange', target: 'setting' },
                { target: '#emptySession.open.ready' },
              ],
            },
            setting: {
              invoke: {
                id: 'setConfigOption',
                src: 'setConfigOption',
                input: ({ context }) => {
                  const change = nextChange(context);
                  if (!change) throw new Error('No remembered change.');
                  return { context, change };
                },
                onDone: {
                  target: 'choosing',
                  actions: assign(({ context, event }) => ({
                    configOptions: event.output,
                    applied: appliedOnce(context),
                  })),
                },
                // A choice the Agent refuses stays as the Session opened.
                onError: {
                  target: 'choosing',
                  actions: assign(({ context }) => ({
                    applied: appliedOnce(context),
                  })),
                },
              },
            },
          },
        },
        ready: {
          always: { guard: 'hasPendingPrompt', target: 'prompting' },
        },
        // Choices and Send wait for the prompt's answer.
        prompting: {
          on: {
            'choices.changed': { actions: 'takeChoices' },
            send: { actions: [] },
            'feed.showsPrompt': { actions: 'showPrompt' },
          },
          invoke: {
            id: 'prompt',
            src: 'prompt',
            input: ({ context }) => context,
            onDone: { target: 'showingPrompt' },
            onError: {
              target: 'ready',
              actions: assign({
                pendingPrompt: undefined,
                promptShown: false,
                error: ({ event }) => errorMessage(event.error),
              }),
            },
          },
        },
        // The Session page takes over once the Feed it starts from holds the prompt, so the prompt never drops out.
        showingPrompt: {
          always: { guard: 'promptShown', target: toHandedOff },
          after: { promptShowTimeout: toHandedOff },
          on: {
            'choices.changed': { actions: 'takeChoices' },
            send: { actions: [] },
            'feed.showsPrompt': toHandedOff,
          },
        },
      },
    },
    // Closing the previous Session before one opens for the new choices.
    closing: {
      invoke: {
        id: 'close',
        src: 'close',
        input: ({ context }) => context,
        onDone: { target: 'waiting', actions: 'forgetSession' },
        onError: { target: 'waiting', actions: 'forgetSession' },
      },
      on: {
        'choices.changed': { actions: 'takeChoices' },
        send: { actions: 'queuePrompt' },
      },
    },
    // The open failed: the draft stays, and a retry, a new choice or Send opens again.
    failed: {
      on: {
        retry: { guard: 'canOpen', target: 'opening' },
        'choices.changed': [
          {
            guard: 'choicesChanged',
            target: 'waiting',
            actions: 'takeChoices',
          },
          { actions: 'takeChoices' },
        ],
        send: { guard: 'canOpen', target: 'opening', actions: 'queuePrompt' },
      },
    },
    // The first prompt reached the Session; it is the Session page's now.
    handedOff: { type: 'final', entry: 'handOff' },
  },
});
