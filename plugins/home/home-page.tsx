import {
  Button,
  Callout,
  EmptyState,
  ScrollView,
  Screen,
  SignInRequired,
  Stack,
  type Argo,
  type GatedPage,
  type NamedQuery,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { householdSections, type HomeState } from './home-cards';
import { homeEditor } from './home-editor';
import { homeWords } from './home-words';
import { hueHost, pollMs } from './hue';
import { homeData } from './hue-client';
import type { HomeData, Household } from './hue-model';

/*
 * The Home page: the household's lights, read again every ten seconds while it is on screen. Before the Bridge is
 * connected it offers to connect it, and a failed read says so with a way to try again.
 */
const connect = (to: PageTo<HomeState>): JSX.Element => (
  <Stack direction="column" gap={4}>
    <EmptyState
      icon="lightbulb"
      title={homeWords.connect}
      description={homeWords.connectDescription}
    />
    <Button
      label={homeWords.connectButton}
      onPress={to.run('connectBridge', {})}
    />
  </Stack>
);

const failed = (reason: string, to: PageTo<HomeState>): JSX.Element => (
  <Stack direction="column" gap={4}>
    <Callout tone="danger" title={homeWords.failed} description={reason} />
    <Button label={homeWords.retry} onPress={to.set({})} />
  </Stack>
);

const empty = (
  <EmptyState
    icon="lightbulb"
    title={homeWords.noLights}
    description={homeWords.noLightsDescription}
  />
);

const isEmpty = ({ rooms, others }: Household): boolean =>
  rooms.length === 0 && others.length === 0;

const lights = (
  household: Household,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element =>
  isEmpty(household) ? (
    empty
  ) : (
    <Stack
      direction={{ compact: 'column', medium: 'column', wide: 'row' }}
      align="stretch"
    >
      <ScrollView>
        <Stack direction="column" gap={6}>
          {householdSections(household, state, to)}
        </Stack>
      </ScrollView>
      {homeEditor(household, state, to)}
    </Stack>
  );

function body(
  data: HomeData,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element {
  if (data.kind === 'connect') return connect(to);

  return data.kind === 'failed'
    ? failed(data.reason, to)
    : lights(data.household, state, to);
}

export const defineHouseholdQuery = (argo: Argo): NamedQuery<HomeData> =>
  argo.queries.define('household', () => homeData(argo))({});

export const homePage = (
  argo: Argo,
  household: NamedQuery<HomeData>,
): GatedPage<HomeState, HomeData> => ({
  every: pollMs,
  state: { editor: '', sceneSearch: '' },
  load: async ({ read }) => {
    if (!(await argo.accounts.get(hueHost))) throw new SignInRequired();

    return read(household);
  },
  render: (data, to, { state }) => (
    <Screen title={homeWords.title}>{body(data, state, to)}</Screen>
  ),
});
