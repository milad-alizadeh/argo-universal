import { kitComponentEvents } from './kit';
import {
  PageCall,
  componentEventHandler,
  componentEventRules,
  type WireJson,
  type WireNode,
} from './wire';
import { PayloadValue, type OperationCall } from './wire-action';

// The params of one of the Plugin's Operations its manifest marks secret, by the Operation's name.
export type SecretParams = (operation: string) => ReadonlySet<string>;

const isPayload = (value: WireJson): boolean =>
  PayloadValue.safeParse(value).success;

const holdsPayload = (values: Record<string, WireJson>): boolean =>
  Object.values(values).some(isPayload);

const toPageState =
  'puts a secret in Page state: pass it to an Operation param marked "secret": true in plugin.json';

const toOptimistic =
  'shows a secret in optimistic props: leave the payload out of them';

/*
 * Why a node's secret value would go somewhere it may not (ADR-0051), naming the fix: a SecretField's text goes only
 * to an Operation param the manifest marks secret, never into Page state, which is part of the Page address the App
 * keeps, and never into optimistic props, which the App shows in its kept tree.
 */
export function secretBindingReason(
  node: WireNode,
  secretParams: SecretParams,
): string | undefined {
  const reasons = Object.entries(kitComponentEvents(node.type))
    .filter(([, schema]) => componentEventRules(schema).secret)
    .flatMap(([name, schema]) => {
      const reason = handlerReason(
        componentEventHandler(node.props, name, schema),
        secretParams,
      );

      return reason ? [`${node.type} ${name} ${reason}`] : [];
    });

  return reasons[0];
}

function handlerReason(
  handler: WireJson | undefined,
  secretParams: SecretParams,
): string | undefined {
  const call = PageCall.safeParse(handler).data;

  return call && callReason(call, secretParams);
}

const reachesPageState = (call: PageCall): boolean =>
  'bind' in call || ('pageState' in call && holdsPayload(call.pageState));

function callReason(
  call: PageCall,
  secretParams: SecretParams,
): string | undefined {
  if (reachesPageState(call)) return toPageState;

  return 'operation' in call ? runReason(call, secretParams) : undefined;
}

const showsPayload = ({ optimistic = [] }: OperationCall): boolean =>
  optimistic.some(({ props }) => holdsPayload(props));

// The first param the call fills from the payload that the manifest does not mark secret.
const unmarkedParam = (
  { args }: OperationCall,
  secret: ReadonlySet<string>,
): string | undefined =>
  Object.keys(args).find(
    (name) => isPayload(args[name] ?? null) && !secret.has(name),
  );

function runReason(
  call: OperationCall,
  secretParams: SecretParams,
): string | undefined {
  if (showsPayload(call)) return toOptimistic;

  const param = unmarkedParam(call, secretParams(call.operation));

  return param && unmarkedReason(param, call.operation);
}

const unmarkedReason = (param: string, operation: string): string =>
  `passes a secret to param ${param} of ${operation}: mark it "secret": true in plugin.json`;
