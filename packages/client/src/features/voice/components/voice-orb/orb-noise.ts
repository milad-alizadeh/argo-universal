const size = 256;

// How many random values the noise lattice holds along each side; it wraps, so the texture tiles.
const lattice = 16;

const octaves = [
  { cells: lattice, weight: 0.65 },
  { cells: lattice * 2, weight: 0.35 },
];

const byteMax = 255;

const channels = 4;

const multiplier = 1664525;

const increment = 1013904223;

const modulus = 4294967296;

const cubic = 3;

// Seeded so the same orb is drawn each time: a small linear congruential generator.
function randoms(count: number, seed: number): number[] {
  let state = seed;

  return Array.from({ length: count }, () => {
    state = (state * multiplier + increment) % modulus;

    return state / modulus;
  });
}

const smooth = (t: number): number => t * t * (cubic - 2 * t);

type Grid = { cells: number; values: number[] };

const at = ({ cells, values }: Grid, x: number, y: number): number =>
  values[(y % cells) * cells + (x % cells)] ?? 0;

// One octave of value noise at a texel, the lattice cells blended smoothly.
function sample(grid: Grid, u: number, v: number): number {
  const x = u * grid.cells;
  const y = v * grid.cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const top = at(grid, x0, y0) * (1 - fx) + at(grid, x0 + 1, y0) * fx;

  const bottom =
    at(grid, x0, y0 + 1) * (1 - fx) + at(grid, x0 + 1, y0 + 1) * fx;

  return top * (1 - fy) + bottom * fy;
}

const gridsOf = (): { grid: Grid; weight: number }[] =>
  octaves.map(({ cells, weight }) => ({
    grid: { cells, values: randoms(cells * cells, cells) },
    weight,
  }));

// The noise at one texel, every octave blended by its weight.
function valueAt(grids: ReturnType<typeof gridsOf>, index: number): number {
  const u = (index % size) / size;
  const v = Math.floor(index / size) / size;

  return grids.reduce(
    (sum, { grid, weight }) => sum + sample(grid, u, v) * weight,
    0,
  );
}

/*
 * The smooth, tiling noise the orb's shader reads for its flow, as RGBA texels. ElevenLabs' orb loads a noise image from
 * its CDN; this makes the same kind of image locally, so the orb needs no network and no asset.
 */
function madeTexels(): Uint8Array {
  const grids = gridsOf();
  const texels = new Uint8Array(size * size * channels);

  for (let index = 0; index < size * size; index += 1) {
    const grey = valueAt(grids, index) * byteMax;
    texels.set([grey, grey, grey, byteMax], index * channels);
  }

  return texels;
}

let made: Uint8Array | undefined;

// The noise is the same for every orb, so it is made once, the first time an orb draws.
export function noiseTexels(): Uint8Array {
  made ??= madeTexels();

  return made;
}

export const noiseSize = size;
