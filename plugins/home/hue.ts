/*
 * Philips Hue's Remote API, which reaches the person's Hue Bridge through Hue's cloud, so the Plugin needs no local
 * network access. Hue's developer pages for it (developers.meethue.com, "Remote Authentication and Control" and the
 * CLIP API v2 reference) sit behind a developer login, so each URL and body here is the widely cited one and is
 * UNCONFIRMED against Hue's own reference: check them once a Hue developer account can read those pages.
 *
 * This module imports nothing from the kit, so the tests share it.
 */

// The Account's host: Hue's Remote API, whose token every call carries as Bearer.
export const hueHost = 'api.meethue.com';

// UNCONFIRMED: Hue's v2 OAuth endpoints. Hue's public "new Hue API" page says to use `/v2/oauth2`, not v1's `/oauth2`.
export const authorizeUrl = `https://${hueHost}/v2/oauth2/authorize`;

export const tokenUrl = `https://${hueHost}/v2/oauth2/token`;

// UNCONFIRMED: the Bridge's v1 API through the cloud, where the virtual link button and the application key live.
const routeApi = `https://${hueHost}/route/api`;

// Pressing the link button over the Remote API, and asking for an application key while it is pressed.
export const linkButtonUrl = `${routeApi}/0/config`;

export const applicationKeyUrl = routeApi;

// Who the Bridge is: its id names the Account.
export const bridgeConfigUrl = linkButtonUrl;

// UNCONFIRMED: CLIP API v2 through the cloud; each call also carries the application key in `hue-application-key`.
const resourceUrl = `https://${hueHost}/route/clip/v2/resource`;

export type HueResource = 'light' | 'room' | 'grouped_light';

export const resourcesUrl = (kind: HueResource): string =>
  `${resourceUrl}/${kind}`;

export const resourceUrlOf = (kind: HueResource, id: string): string =>
  `${resourcesUrl(kind)}/${encodeURIComponent(id)}`;

export const applicationKeyHeader = 'hue-application-key';

// What this Plugin calls itself when it asks the Bridge for an application key.
export const deviceType = 'argo#home';

// The Plugin's secret Settings: the person's Remote API app, since Argo ships no client ID or secret.
export const clientIdSetting = 'hue-client-id';

export const clientSecretSetting = 'hue-client-secret';

// The Secret that keeps the Bridge's application key.
export const applicationKeySecret = 'hue-application-key';

// Brightness is a percentage in CLIP v2's `dimming.brightness`.
export const brightnessRange = { min: 1, max: 100 } as const;

// A page on a clock reads again every ten seconds, the least Argo allows.
export const pollMs = 10_000;
