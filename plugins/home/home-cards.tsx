import {
  Card,
  FieldGroup,
  Grid,
  Stack,
  Text,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { roomSubtitle, homeWords } from './home-words';
import { brightnessRange } from './hue';
import type { Household, Room, Switch } from './hue-model';

/*
 * The household as a Grid of Cards: each room under its name, its own card switching every light in it, then a card
 * for each of its lights; the lights no room holds come last. Each card has a power Toggle and a brightness Slider.
 * There is no colour control: the kit has no colour picker.
 */
const columns = { compact: 1, medium: 2, wide: 3 };

const target = ({ kind, id }: Switch): Pick<Switch, 'kind' | 'id'> => ({
  kind,
  id,
});

function controls(light: Switch, to: PageTo): JSX.Element {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Toggle
          title={homeWords.power}
          value={light.on}
          onValueChange={to.run('setPower', {
            ...target(light),
            on: to.payload(),
          })}
        />
        <FieldGroup.Slider
          title={homeWords.brightness}
          value={light.brightness}
          {...brightnessRange}
          step={1}
          valueLabel={`${light.brightness}%`}
          onValueChange={to.run('setBrightness', {
            ...target(light),
            brightness: to.payload(),
          })}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

type Shown = { light: Switch; title: string; subtitle?: string };

const switchCard = (
  { light, title, subtitle }: Shown,
  to: PageTo,
): JSX.Element => (
  <Card key={light.id} title={title} {...(subtitle && { subtitle })}>
    {controls(light, to)}
  </Card>
);

const roomCard = (room: Room, to: PageTo): JSX.Element[] =>
  room.group
    ? [
        switchCard(
          {
            light: room.group,
            title: homeWords.allLights,
            subtitle: roomSubtitle(room.lights.length),
          },
          to,
        ),
      ]
    : [];

const lightCards = (lights: readonly Switch[], to: PageTo): JSX.Element[] =>
  lights.map((light) => switchCard({ light, title: light.name }, to));

function section(title: string, cards: JSX.Element[]): JSX.Element {
  return (
    <Stack key={title} direction="column" gap={3}>
      <Text role="title">{title}</Text>
      <Grid columns={columns} gap={3}>
        {cards}
      </Grid>
    </Stack>
  );
}

const roomSection = (room: Room, to: PageTo): JSX.Element =>
  section(room.name, [...roomCard(room, to), ...lightCards(room.lights, to)]);

const otherSection = (others: readonly Switch[], to: PageTo): JSX.Element[] =>
  others.length > 0
    ? [section(homeWords.otherLights, lightCards(others, to))]
    : [];

export const householdSections = (
  household: Household,
  to: PageTo,
): JSX.Element[] => [
  ...household.rooms.map((room) => roomSection(room, to)),
  ...otherSection(household.others, to),
];
