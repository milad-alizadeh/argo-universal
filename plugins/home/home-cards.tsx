import { FieldGroup, Grid, Stack, Text, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { roomSubtitle, homeWords } from './home-words';
import { brightnessRange } from './hue';
import type { Household, Room, Switch } from './hue-model';

/*
 * The household as a Grid of FieldGroups: each room under its name, its own card switching every light in it, then one for each of its lights; the lights no room holds come last. Each has a power Toggle and a brightness Slider.
 * There is no colour control: the kit has no colour picker.
 */
const columns = { compact: 1, medium: 2, wide: 3 };

const target = ({ kind, id }: Switch): Pick<Switch, 'kind' | 'id'> => ({
  kind,
  id,
});

const power = (light: Switch, to: PageTo): JSX.Element => (
  <FieldGroup.Toggle
    title={homeWords.power}
    value={light.on}
    onValueChange={to.run('setPower', { ...target(light), on: to.payload() })}
  />
);

const brightness = (light: Switch, to: PageTo): JSX.Element => (
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
);

type Shown = { light: Switch; title: string; footer?: string };

// One light as its own FieldGroup Section: the name is the Section's title, so no Card wraps it.
const switchSection = (
  { light, title, footer }: Shown,
  to: PageTo,
): JSX.Element => (
  <FieldGroup key={light.id}>
    <FieldGroup.Section title={title} {...(footer && { footer })}>
      {power(light, to)}
      {brightness(light, to)}
    </FieldGroup.Section>
  </FieldGroup>
);

const roomSwitch = (room: Room, to: PageTo): JSX.Element[] =>
  room.group
    ? [
        switchSection(
          {
            light: room.group,
            title: homeWords.allLights,
            footer: roomSubtitle(room.lights.length),
          },
          to,
        ),
      ]
    : [];

const lightSections = (lights: readonly Switch[], to: PageTo): JSX.Element[] =>
  lights.map((light) => switchSection({ light, title: light.name }, to));

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
  section(room.name, [
    ...roomSwitch(room, to),
    ...lightSections(room.lights, to),
  ]);

const otherSection = (others: readonly Switch[], to: PageTo): JSX.Element[] =>
  others.length > 0
    ? [section(homeWords.otherLights, lightSections(others, to))]
    : [];

export const householdSections = (
  household: Household,
  to: PageTo,
): JSX.Element[] => [
  ...household.rooms.map((room) => roomSection(room, to)),
  ...otherSection(household.others, to),
];
