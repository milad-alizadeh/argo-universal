import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowPattern,
} from '@repo/contracts/plugins/oauth-flow-api';
import { bearer, provideKept, tokenLender, type Refresh } from './kept-token';
import { browserFlow } from './oauth-browser';
import { oauthRefresh } from './oauth-token';
import { flowCredential } from './sign-in-credentials';

type Given = { argo: OAuthFlowArgo; options: OAuthFlowOptions };

/*
 * A kit pattern on the open `argo.oauth`, `argo.fetch`, `argo.accounts` and `argo.secrets` calls: start a
 * sign-in, wait for the browser, exchange the code for a token, add the Account and keep its token, saying
 * `argo.changed()` at each step so the pages that draw the state redraw.
 */
export const oauthFlow: OAuthFlowPattern = (argo, options) => {
  const refresh = oauthRefresh(argo.fetch, options);

  const credential = oauthCredential({ argo, options }, refresh);

  const given = { argo: { ...argo, secrets: credential.keeping }, options };

  return credential.attach(
    Object.freeze({
      serverDevice: true,
      ...browserFlow(given),
      provide: () => provideKept(argo, options, refresh),
    }),
  );
};

function oauthCredential(
  { argo, options }: Given,
  refresh: Refresh,
): ReturnType<typeof flowCredential<OAuthFlowArgo['secrets']>> {
  const header = options.header ?? bearer;

  return flowCredential(
    argo.secrets,
    { host: options.host, header },
    (secrets) => {
      const lend = tokenLender(secrets, refresh);

      return (account): Promise<string | null> => lend(account.id);
    },
  );
}
