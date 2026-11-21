import { useState, type ReactElement } from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Grid } from '#primitives/layout/grid';
import { Spacer } from '#primitives/layout/spacer';
import { Stack } from '#primitives/layout/stack';
import { Fader } from './fader';
import {
  horizontalFader,
  tileFixtures,
  type TileFixture,
} from './fader-fixtures';
import type { FaderProps } from './fader-props';

const percent = (value: number): string => `${String(value)}%`;

// A Fader the caller holds, as a Plugin's page does: it drags against local state and its label follows.
export function HeldFader(props: FaderProps): ReactElement {
  const [value, setValue] = useState(props.value);

  return (
    <Fader
      {...props}
      value={value}
      valueLabel={value === undefined ? '' : percent(value)}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange?.(next);
      }}
    />
  );
}

const PowerButton = (props: { name: string }): ReactElement => (
  <IconButton
    icon="power"
    variant="secondary"
    size="sm"
    accessibilityLabel={`${props.name} power`}
  />
);

function TileHeader(props: { title: string }): ReactElement {
  return (
    <Stack direction="row" align="center" gap={2}>
      <Text role="row">{props.title}</Text>
      <Spacer />
      <PowerButton name={props.title} />
    </Stack>
  );
}

function TileValue(props: { value: number; detail: string }): ReactElement {
  return (
    <Stack direction="column">
      <Text role="title">
        {props.value === 0 ? 'Off' : percent(props.value)}
      </Text>
      <Text role="secondary">{props.detail}</Text>
    </Stack>
  );
}

const range = { minimumValue: 0, maximumValue: 100, step: 1 };

const tileProps = (tile: TileFixture, value: number): FaderProps => ({
  ...range,
  value,
  accessibilityLabel: tile.title,
  valueLabel: percent(value),
  fill: tile.fill,
});

function Tile(props: TileFixture): ReactElement {
  const [value, setValue] = useState(props.value);

  return (
    <Fader {...tileProps(props, value)} onValueChange={setValue}>
      <TileHeader title={props.title} />
      <TileValue value={value} detail={props.detail} />
    </Fader>
  );
}

function AllLightsLabel(props: { value: number }): ReactElement {
  return (
    <Stack direction="column">
      <Text role="row">All lights</Text>
      <Text role="secondary">{`4 lights · ${percent(props.value)}`}</Text>
    </Stack>
  );
}

// A short bar over all the tiles, which fills left to right.
function AllLights(): ReactElement {
  const [value, setValue] = useState(horizontalFader.value);
  const bar = { ...horizontalFader, value, valueLabel: percent(value) };

  return (
    <Fader {...bar} onValueChange={setValue}>
      <AllLightsLabel value={value} />
      <PowerButton name="All lights" />
    </Fader>
  );
}

const columns = { compact: 2, medium: 3, wide: 5 };

// A room's lights as tiles: a bar over all of them, then a grid of vertical Faders.
export function FaderTiles(): ReactElement {
  return (
    <Stack direction="column" gap={3}>
      <Text role="nav-title">Living room</Text>
      <AllLights />
      <Grid columns={columns} gap={3}>
        {tileFixtures.map((tile) => (
          <Tile key={tile.id} {...tile} />
        ))}
      </Grid>
    </Stack>
  );
}
