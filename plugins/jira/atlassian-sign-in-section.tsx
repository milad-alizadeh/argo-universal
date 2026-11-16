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

type Row = { title: string; onPress: Press; disabled: boolean; footer: string };

// Why the last sign-in failed, such as the port in use or Atlassian refusing the client secret, or what it does.
const footerOf = (state: OAuthFlowState): string =>
  state.kind === 'failed' ? state.message : atlassianWords.offer;

function hereRow(state: OAuthFlowState, runs: AtlassianRuns): Row {
  if (state.kind === 'waiting')
    return {
      title: atlassianWords.cancel,
      onPress: runs.cancel,
      disabled: false,
      footer: atlassianWords.waiting,
    };

  return {
    title: atlassianWords.start,
    onPress: runs.start,
    disabled: false,
    footer: footerOf(state),
  };
}

// Offered but not here: the row holds still, and the footer says what to do instead.
const heldRow = (footer: string, runs: AtlassianRuns): Row => ({
  title: atlassianWords.start,
  onPress: runs.start,
  disabled: true,
  footer,
});

function rowOf(offer: AtlassianOffer, runs: AtlassianRuns): Row {
  if (offer.kind === 'here') return hereRow(offer.state, runs);

  return heldRow(
    offer.kind === 'needs-app'
      ? atlassianWords.needsApp
      : atlassianWords.elsewhere,
    runs,
  );
}

// The last section of the sign-in form, under the token paste, which stays the default way in.
export function atlassianSection(
  offer: AtlassianOffer,
  runs: AtlassianRuns,
): JSX.Element {
  const { footer, ...row } = rowOf(offer, runs);

  return (
    <FieldGroup.Section
      key="atlassian"
      title={atlassianWords.section}
      footer={footer}
    >
      <FieldGroup.Link key="atlassian" {...row} />
    </FieldGroup.Section>
  );
}
