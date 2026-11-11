import type { Argo } from './argo-api';
import type { OAuthFlow, OAuthFlowState } from './oauth-flow-api';

// What a device flow calls: the service, the Account it adds, the token it keeps, and the page it redraws.
export type DeviceFlowArgo = Pick<Argo, 'fetch' | 'changed'> & {
  accounts: Pick<Argo['accounts'], 'add' | 'provide'>;
  secrets: Pick<Argo['secrets'], 'set' | 'get'>;
};

/*
 * One service's device flow (RFC 8628), as `deviceFlow(argo, options)` takes it: the person enters a code on
 * any device, and the Plugin polls for the token. Nothing here needs a client secret or the Server Device.
 *
 * - `name` is how the service is called on the sign-in page, such as `GitHub`.
 * - `host` is the Account's API host, which the Plugin declares in `contributes.accounts` and as a `fetch`
 *   Capability; `deviceUrl` and `tokenUrl` are the service's, whose hosts need a `fetch` Capability too.
 * - `label` names whose Account the token opens: the `field` of the JSON `url` answers when it is called with
 *   the token. The kit makes that call, so Plugin code never holds a token.
 * - `header` is how a borrower's request carries the token, `Authorization: Bearer` by default.
 */
export type DeviceFlowOptions = Readonly<{
  host: string;
  name: string;
  clientId: string;
  scope?: string;
  deviceUrl: string;
  tokenUrl: string;
  label: Readonly<{ url: string; field: string }>;
  header?: Readonly<{ header: string; prefix: string }>;
}>;

export type DeviceFlowEnd = 'denied' | 'expired' | 'failed';

/*
 * Where the Plugin's one sign-in stands: asking for a code, showing it until it runs out (`expiresAt`, and
 * `lifetimeMs` from the start, for a countdown), signed in as the Account just added, or ended and why.
 */
export type DeviceFlowState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | {
      kind: 'code';
      userCode: string;
      verificationUri: string;
      expiresAt: number;
      lifetimeMs: number;
    }
  | { kind: 'signed-in'; label: string }
  | { kind: 'ended'; end: DeviceFlowEnd; message: string };

/*
 * A Plugin's device-flow sign-in for one service. It lives in the Plugin's module, so every page and every App
 * sees one sign-in, and each change of `state()` calls `argo.changed()`. `start()` answers once the code is
 * shown, or why it could not be; `cancel()` ends the wait; `provide()` registers the Account's provider.
 */
export type DeviceFlow = Readonly<{
  serverDevice: false;
  state: () => DeviceFlowState;
  start: () => Promise<DeviceFlowState>;
  cancel: () => DeviceFlowState;
  provide: () => Promise<void>;
}>;

export type DeviceFlowPattern = (
  argo: DeviceFlowArgo,
  options: DeviceFlowOptions,
) => DeviceFlow;

// Either sign-in the kit offers; a gate and a sign-in page draw both.
export type SignInFlow = DeviceFlow | OAuthFlow;

export type SignInState = DeviceFlowState | OAuthFlowState;
