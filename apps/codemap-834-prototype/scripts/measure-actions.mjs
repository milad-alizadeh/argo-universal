import { timing } from './measure-options.mjs';

const grid = { first: 0.35, last: 0.7, step: 0.1 };

export function errors(page) {
  const messages = [];
  page.on('pageerror', (error) => messages.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text());
  });

  return messages;
}

export async function snapshot(page) {
  return page.evaluate(() => ({
    ...window.__codemap834,
    pan: undefined,
    viewport: {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      visibility: document.visibilityState,
    },
  }));
}

function deadline(timer) {
  return new Promise((_, reject) => {
    timer.value = setTimeout(
      () => reject(new Error('Pan sample stalled beyond 10 seconds')),
      timing.deadline,
    );
  });
}

async function pan(page) {
  const timer = { value: undefined };

  try {
    return await Promise.race([
      page.evaluate(
        (duration) => window.__codemap834.pan(duration),
        timing.pan,
      ),
      deadline(timer),
    ]);
  } finally {
    clearTimeout(timer.value);
  }
}

export async function samples(page, count) {
  const result = [];

  for (let index = 0; index < count; index++) {
    await page.bringToFront();
    result.push(await pan(page));
  }

  return result;
}

function* points(bounds) {
  for (let y = grid.first; y <= grid.last; y += grid.step)
    for (let x = grid.first; x <= grid.last; x += grid.step)
      yield { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y };
}

async function pickGrid(page, bounds) {
  for (const point of points(bounds)) {
    await page.mouse.click(point.x, point.y);

    const selected = await page.evaluate(
      () => window.__codemap834.selectedId ?? null,
    );

    if (selected) return selected;
  }

  return null;
}

export async function pick(page) {
  const bounds = await page.locator('canvas').first().boundingBox();

  if (!bounds) return null;

  return pickGrid(page, bounds);
}
