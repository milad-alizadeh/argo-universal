import {
  ColourWheel,
  EmptyState,
  GradientTile,
  Grid,
  Inspector,
  Slider,
  Spacer,
  Stack,
  Text,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { HomeState } from './home-cards';
import { brightnessRange } from './hue';
import type { Household, Room, Switch } from './hue-model';

type Target = { kind: 'light'; light: Switch } | { kind: 'room'; room: Room };

function targetOf(household: Household, editor: string): Target | null {
  const room = household.rooms.find(({ id }) => editor === `room:${id}`);

  if (room?.lights.some(({ reachable }) => reachable))
    return { kind: 'room', room };

  const light = [
    ...household.rooms.flatMap((each) => each.lights),
    ...household.others,
  ].find(({ id }) => editor === `light:${id}`);

  return light?.reachable ? { kind: 'light', light } : null;
}

function lightEditor(light: Switch, to: PageTo<HomeState>): JSX.Element {
  const percentage = `${Math.round(light.brightness)}%`;

  return (
    <Stack direction="column" gap={4}>
      {!light.on && (
        <Stack direction="column">
          <Text role="row">Off</Text>
          <Text role="secondary">
            Your changes apply when the light turns on.
          </Text>
        </Stack>
      )}
      {light.colour && (
        <Stack direction="column" gap={2}>
          <Text role="row">Colour</Text>
          <ColourWheel
            key={light.id}
            accessibilityLabel="Colour"
            onValueChange={to.run('setColour', {
              id: light.id,
              hue: to.payload('hue'),
              saturation: to.payload('saturation'),
            })}
          />
        </Stack>
      )}
      <Stack direction="row" align="center">
        <Text role="row">Brightness</Text>
        <Spacer />
        <Text role="secondary">{percentage}</Text>
      </Stack>
      <Slider
        accessibilityLabel="Brightness"
        minimumValue={brightnessRange.min}
        maximumValue={brightnessRange.max}
        step={1}
        value={light.brightness}
        valueLabel={percentage}
        onValueChange={to.run('setBrightness', {
          kind: 'light',
          id: light.id,
          brightness: to.payload(),
        })}
      />
    </Stack>
  );
}

const sceneColumns = { compact: 2, medium: 3, wide: 2 };

function roomEditor(
  room: Room,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element {
  if (room.scenes.length === 0)
    return (
      <EmptyState
        title="No scenes in this room"
        description="Create scenes in the Hue app."
      />
    );

  const query = state.sceneSearch.trim().toLowerCase();

  const scenes = room.scenes.filter(({ name }) =>
    name.toLowerCase().includes(query),
  );

  return (
    <Stack direction="column" gap={3}>
      {scenes.length === 0 ? (
        <EmptyState title="No scenes match" />
      ) : (
        <Grid columns={sceneColumns} gap={3}>
          {scenes.map((scene) => (
            <GradientTile
              key={scene.id}
              title={scene.name}
              fill={[...scene.colours]}
              selected={scene.active}
              onPress={to.run('recallScene', { id: scene.id })}
            />
          ))}
        </Grid>
      )}
    </Stack>
  );
}

export function homeEditor(
  household: Household,
  state: HomeState,
  to: PageTo<HomeState>,
): JSX.Element | null {
  const target = targetOf(household, state.editor);

  if (!target) return null;

  const close = to.set({ editor: '', sceneSearch: '' });

  const title =
    target.kind === 'light' ? target.light.name : `${target.room.name} scenes`;

  const search = target.kind === 'room' && target.room.scenes.length > 0;

  return (
    <Inspector
      open
      title={title}
      onOpenChange={close}
      closeLabel="Done"
      search={search ? { label: 'Search scenes' } : undefined}
      value={search ? state.sceneSearch : undefined}
      onChangeText={search ? to.bind('sceneSearch') : undefined}
    >
      {target.kind === 'light'
        ? lightEditor(target.light, to)
        : roomEditor(target.room, state, to)}
    </Inspector>
  );
}
