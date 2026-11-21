import { provideSignIn, signInGate, type Argo } from '@argo/plugin-kit';
import { defineHouseholdQuery, homePage } from './home-page';
import { homeWords } from './home-words';
import { connectBridge } from './hue-bridge';
import { registerHueOperations } from './hue-operations';
import { hueSignIn } from './hue-sign-in';

// A household dashboard for Philips Hue lights, through Hue's Remote API as the person signed in.
export async function register(argo: Argo): Promise<void> {
  const flow = hueSignIn(argo);
  const service = { name: homeWords.service };

  await provideSignIn(argo, flow, service);
  argo.operations.register('connectBridge', () => connectBridge(argo));
  const household = defineHouseholdQuery(argo);

  registerHueOperations(argo);
  argo.pages.define('/', signInGate(flow, service, homePage(argo, household)));
}
