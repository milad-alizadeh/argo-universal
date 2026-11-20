import { provideSignIn, signInGate, type Argo } from '@argo/plugin-kit';
import { homePage } from './home-page';
import { homeWords } from './home-words';
import { connectBridge } from './hue-bridge';
import { change } from './hue-client';
import { hueSignIn } from './hue-sign-in';

// A household dashboard for Philips Hue lights, through Hue's Remote API as the person signed in.
export async function register(argo: Argo): Promise<void> {
  const flow = hueSignIn(argo);
  const service = { name: homeWords.service };

  await provideSignIn(argo, flow, service);
  argo.operations.register('connectBridge', () => connectBridge(argo));
  argo.operations.register('setPower', ({ kind, id, on }) =>
    change(argo, { kind, id, body: { on: { on } } }),
  );
  argo.operations.register('setBrightness', ({ kind, id, brightness }) =>
    change(argo, { kind, id, body: { dimming: { brightness } } }),
  );
  argo.pages.define('/', signInGate(flow, service, homePage(argo)));
}
