import { FieldGroup, type OAuthFlowState, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { atlassianWords } from './atlassian-words';

/*
 * Where "Sign in with Atlassian" stands for the Device drawing the sign-in page: not offered until the person sets
 * their OAuth app's client ID and secret, offered on the Server Device, whose browser and callback port it needs, and
 * handed over there from any other Device.
 */
export type AtlassianOffer =
  | { kind: 'needs-app' }
  | { kind: 'elsewhere' }
  | { kind: 'here'; state: OAuthFlowState };

// What the section's rows do: the Operations the page runs.
type Press = ReturnType<PageTo['run']>;

export type AtlassianRuns = { start: Press; cancel: Press };

type Shown = { row: JSX.Element; footer: string };

const link = (title: string, onPress: Press): JSX.Element => (
  <FieldGroup.Link key="atlassian" title={title} onPress={onPress} />
);

// A row that only says why there is no button here; the footer says what to do instead.
const explained = (title: string, value: string, footer: string): Shown => ({
  row: <FieldGroup.Value key="atlassian" title={title} value={value} />,
  footer,
});

// Why the last sign-in failed, such as the port in use or Atlassian refusing the client secret, or what it does.
const footerOf = (state: OAuthFlowState): string =>
  state.kind === 'failed' ? state.message : atlassianWords.offer;

const hereShown = (state: OAuthFlowState, runs: AtlassianRuns): Shown =>
  state.kind === 'waiting'
    ? {
        row: link(atlassianWords.cancel, runs.cancel),
        footer: atlassianWords.waiting,
      }
    : { row: link(atlassianWords.start, runs.start), footer: footerOf(state) };

function shownFor(offer: AtlassianOffer, runs: AtlassianRuns): Shown {
  if (offer.kind === 'here') return hereShown(offer.state, runs);

  const { appTitle, appValue, needsApp } = atlassianWords;
  const { deviceTitle, deviceValue, elsewhere } = atlassianWords;

  return offer.kind === 'needs-app'
    ? explained(appTitle, appValue, needsApp)
    : explained(deviceTitle, deviceValue, elsewhere);
}

/*
 * The last section of the sign-in form, under the token paste, which stays the default way in. Its button is drawn
 * only where it can work: the OAuth app is set up and this is the Server Device.
 */
export function atlassianSection(
  offer: AtlassianOffer,
  runs: AtlassianRuns,
): JSX.Element {
  const { row, footer } = shownFor(offer, runs);

  return (
    <FieldGroup.Section
      key="atlassian"
      title={atlassianWords.section}
      footer={footer}
    >
      {row}
    </FieldGroup.Section>
  );
}
