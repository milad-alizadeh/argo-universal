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
  type PageState,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { householdSections } from './home-cards';
import { homeWords } from './home-words';
import { hueHost, pollMs } from './hue';
import { homeData } from './hue-client';
import type { HomeData, Household } from './hue-model';

/*
 * The Home page: the household's lights, read again every ten seconds while it is on screen. Before the Bridge is
 * connected it offers to connect it, and a failed read says so with a way to try again.
 */
const connect = (to: PageTo): JSX.Element => (
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

const failed = (reason: string, to: PageTo): JSX.Element => (
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

const lights = (household: Household, to: PageTo): JSX.Element =>
  isEmpty(household) ? (
    empty
  ) : (
    <ScrollView>
      <Stack direction="column" gap={6}>
        {householdSections(household, to)}
      </Stack>
    </ScrollView>
  );

function body(data: HomeData, to: PageTo): JSX.Element {
  if (data.kind === 'connect') return connect(to);

  return data.kind === 'failed'
    ? failed(data.reason, to)
    : lights(data.household, to);
}

export const defineHouseholdQuery = (argo: Argo): NamedQuery<HomeData> =>
  argo.queries.define('household', () => homeData(argo))({});

export const homePage = (
  argo: Argo,
  household: NamedQuery<HomeData>,
): GatedPage<PageState, HomeData> => ({
  every: pollMs,
  load: async ({ read }) => {
    if (!(await argo.accounts.get(hueHost))) throw new SignInRequired();

    return read(household);
  },
  render: (data, to) => (
    <Screen title={homeWords.title}>{body(data, to)}</Screen>
  ),
});
