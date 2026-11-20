import {
  Button,
  Callout,
  EmptyState,
  ScrollView,
  Screen,
  Stack,
  type GatedPage,
  type PageState,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { householdSections } from './home-cards';
import { homeWords } from './home-words';
import { pollMs } from './hue';
import { homeData, type HueCalls } from './hue-client';
import type { HomeData, Household } from './hue-model';

/*
 * The Home page: the household's lights, read again every ten seconds while it is on screen. Before the Bridge is
 * connected it offers to connect it, and a failed read says so with a way to try again.
 */
const connect = (to: PageTo): JSX.Element => (
  <Stack direction="column" gap={4}>
    <EmptyState icon="lightbulb" title={homeWords.connect} description={homeWords.connectDescription} />
    <Button label={homeWords.connectButton} onPress={to.run('connectBridge', {})} />
  </Stack>
);

const failed = (reason: string, to: PageTo): JSX.Element => (
  <Stack direction="column" gap={4}>
    <Callout tone="danger" title={homeWords.failed} description={reason} />
    <Button label={homeWords.retry} onPress={to.set({})} />
  </Stack>
);

const empty = (
  <EmptyState icon="lightbulb" title={homeWords.noLights} description={homeWords.noLightsDescription} />
);

const isEmpty = ({ rooms, others }: Household): boolean =>
  rooms.length === 0 && others.length === 0;

const lights = (household: Household, to: PageTo): JSX.Element =>
  isEmpty(household) ? (
    empty
  ) : (
    <ScrollView>
      <Stack direction="column" gap={6}>{householdSections(household, to)}</Stack>
    </ScrollView>
  );

function body(data: HomeData, to: PageTo): JSX.Element {
  if (data.kind === 'connect') return connect(to);

  return data.kind === 'failed' ? failed(data.reason, to) : lights(data.household, to);
}

export const homePage = (argo: HueCalls): GatedPage<PageState, HomeData> => ({
  every: pollMs,
  load: () => homeData(argo),
  render: (data, to) => <Screen title={homeWords.title}>{body(data, to)}</Screen>,
});
