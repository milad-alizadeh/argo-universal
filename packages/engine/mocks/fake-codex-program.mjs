import { createInterface } from 'node:readline';

const badJson = 4;

const noClientInfo = 5;

const outOfOrder = 6;

const handlers = {
  initialize: 'onInitialize',
  initialized: 'onInitialized',
  getAuthStatus: 'onAuthStatus',
};

const say = (message) => console.log(JSON.stringify(message));

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return process.exit(badJson);
  }
}

const named = (message) => typeof message.params?.clientInfo?.name === 'string';

const asksForToken = (params = {}) =>
  params.includeToken === true && params.refreshToken === false;

/*
 * The stand-in app-server is as strict as the real one is believed to be: it exits with a code unless `initialize`
 * carries `clientInfo`, `initialized` comes before `getAuthStatus`, and `getAuthStatus` asks for the token without a
 * refresh. A client that gets the protocol wrong therefore reads as a Codex that did not answer.
 */
class Program {
  initialized = false;

  sawInitialize = false;

  constructor(behavior) {
    this.behavior = behavior;
  }

  line(text) {
    const message = parse(text);

    this[handlers[message.method]]?.(message);
  }

  onInitialized() {
    this.initialized = true;
  }

  onInitialize(message) {
    if (!named(message)) process.exit(noClientInfo);
    this.sawInitialize = true;
    this.startup();
    say({ id: message.id, result: { userAgent: 'fake' } });
  }

  startup() {
    if (this.behavior.kind === 'exits') process.exit(0);

    if (this.behavior.kind === 'noisy') console.log('not json at all');
  }

  onAuthStatus(message) {
    if (!this.inOrder(message)) process.exit(outOfOrder);

    this.answer(message);
  }

  inOrder(message) {
    const ready = this.sawInitialize && this.initialized;

    return ready && asksForToken(message.params);
  }

  answer(message) {
    const { kind, authMethod, authToken } = this.behavior;

    if (kind === 'noisy') console.log('{"unrelated":true}');

    if (kind !== 'silent')
      say({ id: message.id, result: { authMethod, authToken } });
  }
}

export function run(behavior) {
  const program = new Program(behavior);
  createInterface({ input: process.stdin }).on('line', (text) =>
    program.line(text),
  );
}
