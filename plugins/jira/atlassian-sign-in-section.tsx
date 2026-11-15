import {
  Button,
  Stack,
  Text,
  type OAuthFlowState,
  type PageTo,
} from '@argo/plugin-kit';
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

// What the section's buttons do: the Operations the page runs.
type Press = ReturnType<PageTo['run']>;

export type AtlassianRuns = { start: Press; cancel: Press };

const note = (words: string): JSX.Element => (
  <Text key="note" role="secondary">
    {words}
  </Text>
);

function hereRows(state: OAuthFlowState, runs: AtlassianRuns): JSX.Element[] {
  if (state.kind === 'waiting')
    return [
      note(atlassianWords.waiting),
      <Button
        key="cancel"
        label="Cancel"
        variant="secondary"
        onPress={runs.cancel}
      />,
    ];

  const failure =
    state.kind === 'failed'
      ? [
          <Text key="failure" role="secondary" tone="danger">
            {state.message}
          </Text>,
        ]
      : [];

  return [
    note(atlassianWords.offer),
    ...failure,
    <Button
      key="start"
      label={atlassianWords.start}
      variant="secondary"
      onPress={runs.start}
    />,
  ];
}

function rowsOf(offer: AtlassianOffer, runs: AtlassianRuns): JSX.Element[] {
  if (offer.kind === 'needs-app') return [note(atlassianWords.needsApp)];

  return offer.kind === 'elsewhere'
    ? [note(atlassianWords.elsewhere)]
    : hereRows(offer.state, runs);
}

// Drawn under the token paste, which stays the default way in.
export const atlassianSection = (
  offer: AtlassianOffer,
  runs: AtlassianRuns,
): JSX.Element => (
  <Stack key="atlassian" direction="column" gap={3}>
    {rowsOf(offer, runs)}
  </Stack>
);
