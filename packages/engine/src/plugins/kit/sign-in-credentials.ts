import type { Argo } from '@repo/contracts/plugins/argo-api';
import type { SignInFlow } from '@repo/contracts/plugins/device-flow-api';
import type {
  CombinedSignInArgo,
  CombinedSignInFlows,
} from '@repo/contracts/plugins/sign-in-api';
import { signInGroup } from './sign-in-group';
import { tagged, type Secrets } from './tagged-credential';

type Registration = Parameters<Argo['accounts']['provide']>;

type Account = Parameters<Registration[2]>[0];

type Header = Registration[1];

type Lend = Registration[2];

type Flow = { host: string; header: Header };

type Group = ReturnType<typeof signInGroup>;

type Member = Flow & {
  use: (group: Group, key: string, legacy: boolean) => Lend;
};

const members = new WeakMap<SignInFlow, Member>();

const groups = new WeakMap<SignInFlow, Group>();

type Credential<S> = {
  keeping: S;
  attach: <F extends SignInFlow>(flow: F) => F;
};

export function flowCredential<S extends Secrets>(
  secrets: S,
  options: Flow,
  lender: (secrets: S) => Lend,
): Credential<S> {
  const port = { set: secrets.set };

  const use: Member['use'] = (group, key, legacy) => {
    const values = tagged(secrets, key, legacy);
    port.set = queuedWrite(group, key, values.set);

    return lender(values);
  };

  return credentialPort(secrets, port, { ...options, use });
}

function queuedWrite(
  group: Group,
  key: string,
  set: Secrets['set'],
): Secrets['set'] {
  return (id, value) => group.keep(id, key, () => set(id, value));
}

function credentialPort<S extends Secrets>(
  secrets: S,
  port: Pick<Secrets, 'set'>,
  member: Member,
): Credential<S> {
  return {
    keeping: {
      ...secrets,
      set: (id, value): Promise<void> => port.set(id, value),
    },
    attach: attach(member),
  };
}

function attach(member: Member): Credential<Secrets>['attach'] {
  return (flow) => {
    members.set(flow, member);

    return flow;
  };
}

export const currentFlow = ([first]: CombinedSignInFlows): string | undefined =>
  groups.get(first)?.state.current?.key;

export function flowKey(flow: SignInFlow): string {
  if ('pastesToken' in flow) return 'tokenPaste';

  return flow.serverDevice ? 'oauth' : 'device';
}

function memberOf(flow: SignInFlow): Member {
  const member = members.get(flow);

  if (!member) throw new Error('Expected a kit token paste or OAuth flow');

  return member;
}

type Lender = { lend: Lend; prefix: string };

async function lendFor(
  lenders: readonly Lender[],
  account: Account,
): Promise<string | null> {
  for (const { lend, prefix } of lenders) {
    const credential = await lend(account);

    if (credential !== null) return prefixed(prefix, credential);
  }

  return null;
}

const prefixed = (prefix: string, credential: string): string =>
  prefix ? `${prefix} ${credential}` : credential;

function combinedLender(
  group: Group,
  lenders: readonly Lender[],
  changed: () => void,
): Lend {
  return (account) =>
    group.run(account.id, async () => {
      const credential = await lendFor(lenders, account);

      if (credential === null && isCurrent(group, account.id)) {
        delete group.state.current;
        changed();
      }

      return credential;
    });
}

const isCurrent = (group: Group, id: string): boolean =>
  group.state.current?.id === id;

function requireMatch(left: Member, right: Member): void {
  const sameHeader =
    left.header.header.toLowerCase() === right.header.header.toLowerCase();

  if (left.host !== right.host || !sameHeader)
    throw new Error(
      'Combined sign-in flows must use the same Account host and header',
    );
}

function lenderFor(flow: SignInFlow, group: Group, legacy: boolean): Lender {
  const member = memberOf(flow);

  return {
    lend: member.use(group, flowKey(flow), legacy),
    prefix: member.header.prefix,
  };
}

export function provideTogether(
  argo: CombinedSignInArgo,
  flows: CombinedSignInFlows,
): Promise<void> {
  const left = memberOf(flows[0]);
  requireMatch(left, memberOf(flows[1]));

  const lend = lendTogether(flows, argo.changed);

  return argo.accounts.provide(
    left.host,
    { header: left.header.header, prefix: '' },
    lend,
  );
}

function lendTogether(flows: CombinedSignInFlows, changed: () => void): Lend {
  const group = groupFor(flows);

  const lenders = flows.map((flow, index) =>
    lenderFor(flow, group, index === 0),
  );

  return combinedLender(group, lenders, changed);
}

function groupFor(flows: CombinedSignInFlows): Group {
  const group = signInGroup();

  for (const flow of flows) groups.set(flow, group);

  return group;
}
