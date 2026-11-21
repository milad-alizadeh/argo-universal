import {
  Fader,
  Grid,
  IconButton,
  Stack,
  Text,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { homeWords, roomSubtitle } from './home-words';
import { brightnessRange } from './hue';
import { hueSaturationToRgb, maxTileColourStops, toHex } from './hue-colour';
import type { Household, LightColour, Room, Switch } from './hue-model';

export type HomeState = {
  editor: string;
  editorOpen: boolean;
  sceneSearch: string;
};

const columns = { compact: 2, medium: 3, wide: 3 };

type FaderTarget = { light: Switch; title: string; editor: string };

const percent = (brightness: number): string => `${Math.round(brightness)}%`;

const labelOf = ({ on, reachable, brightness }: Switch): string => {
  if (!reachable) return 'Unreachable';

  return on ? percent(brightness) : 'Off';
};

function TileButtons(
  { light, title, editor }: FaderTarget,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element {
  const selected = state.editorOpen && state.editor === editor;

  return (
    <Stack direction="row" align="center" gap={2}>
      <IconButton
        icon="edit"
        size="lg"
        variant={selected ? 'primary' : 'secondary'}
        accessibilityLabel={`Edit ${title}`}
        selected={selected}
        disabled={!light.reachable}
        onPress={to.set({ editor, editorOpen: !selected, sceneSearch: '' })}
      />
      <IconButton
        icon="power"
        size="lg"
        variant="secondary"
        accessibilityLabel={`${title} power`}
        selected={light.on}
        disabled={!light.reachable}
        onPress={to.run('setPower', {
          kind: light.kind,
          id: light.id,
          on: !light.on,
        })}
      />
    </Stack>
  );
}

const hexOf = ({ hue, saturation }: LightColour): string =>
  toHex(hueSaturationToRgb(hue, saturation));

// Keep the reported hue, with a richer shade at the far end of the fill.
function shadeOf({ hue, saturation }: LightColour): string {
  const fullSaturation = 100;
  const saturationBoost = 0.4;
  const shade = 0.94;

  const richer =
    saturation === 0
      ? 0
      : saturation + (fullSaturation - saturation) * saturationBoost;

  const [red, green, blue] = hueSaturationToRgb(hue, richer);

  return toHex([red * shade, green * shade, blue * shade]);
}

function roomFillOf(lights: Room['lights']): string[] | undefined {
  const colours = lights.flatMap(({ on, reachable, colour }) =>
    on && reachable && colour ? [colour] : [],
  );

  const stops = [...new Set(colours.map(hexOf))].slice(0, maxTileColourStops);
  const [first] = colours;

  if (!first) return undefined;

  return stops.length === 1 ? [hexOf(first), shadeOf(first)] : stops;
}

function levelControl(
  {
    light,
    title,
    fill,
  }: Pick<FaderTarget, 'light' | 'title'> & {
    fill?: string[];
  },
  to: PageTo<HomeState>,
): PluginProps['Fader'] {
  const { on, colour, brightness, reachable } = light;

  return {
    value: on && reachable ? brightness : 0,
    valueLabel: labelOf(light),
    accessibilityLabel: `${title} brightness`,
    minimumValue: brightnessRange.min,
    maximumValue: brightnessRange.max,
    step: 1,
    disabled: !reachable,
    fill:
      on && reachable
        ? (fill ?? (colour ? [shadeOf(colour), hexOf(colour)] : undefined))
        : undefined,
    onValueChange: to.run('setBrightness', {
      kind: light.kind,
      id: light.id,
      brightness: to.payload(),
    }),
  };
}

function detailOf(light: Switch): string | null {
  if (!light.reachable) return 'Check the Hue Bridge';

  return light.on ? null : `Was ${percent(light.brightness)}`;
}

function lightTile(
  light: Switch,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element {
  const title = light.name;

  const detail = detailOf(light);

  return (
    <Fader key={light.id} {...levelControl({ light, title }, to)}>
      <Stack direction="column" gap={2}>
        <Stack direction="column" align="end">
          {TileButtons(
            { light, title, editor: `light:${light.id}` },
            state,
            to,
          )}
        </Stack>
        <Text role="row">{title}</Text>
      </Stack>
      <Stack direction="column">
        <Text role={light.reachable ? 'title' : 'heading'}>
          {labelOf(light)}
        </Text>
        {detail && <Text role="secondary">{detail}</Text>}
      </Stack>
    </Fader>
  );
}

function roomFader(
  room: Room,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element | null {
  if (!room.group) return null;

  const title = homeWords.allLights;

  const light = {
    ...room.group,
    reachable: room.lights.some((member) => member.reachable),
  };

  return (
    <Fader
      {...levelControl({ light, title, fill: roomFillOf(room.lights) }, to)}
      orientation="horizontal"
    >
      <Stack direction="column">
        <Text role="row">{title}</Text>
        <Text role="secondary">{`${roomSubtitle(room.lights.length)} · ${labelOf(light)}`}</Text>
      </Stack>
      {TileButtons({ light, title, editor: `room:${room.id}` }, state, to)}
    </Fader>
  );
}

export function householdSections(
  household: Household,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element[] {
  const sections = household.rooms.map((room) => (
    <Stack key={room.id} direction="column" gap={3}>
      <Text role="nav-title">{room.name}</Text>
      {roomFader(room, state, to)}
      <Grid columns={columns} gap={3}>
        {room.lights.map((light) => lightTile(light, state, to))}
      </Grid>
    </Stack>
  ));

  if (household.others.length > 0)
    sections.push(
      <Stack key="other-lights" direction="column" gap={3}>
        <Text role="nav-title">{homeWords.otherLights}</Text>
        <Grid columns={columns} gap={3}>
          {household.others.map((light) => lightTile(light, state, to))}
        </Grid>
      </Stack>,
    );

  return sections;
}
