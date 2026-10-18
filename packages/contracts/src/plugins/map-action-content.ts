import { OverlayAction, type WireNode, WireJson } from './wire';

type Transform = (node: WireNode) => WireNode;

export function mapActionContent(
  props: Record<string, WireJson>,
  transform: Transform,
): Record<string, WireJson> {
  return Object.fromEntries(
    Object.entries(props).map(([name, value]) => [
      name,
      mapValue(value, transform),
    ]),
  );
}

function mapValue(value: WireJson, transform: Transform): WireJson {
  if (Array.isArray(value))
    return value.map((item) => mapValue(item, transform));

  if (value === null) return null;

  return mapScalar(value, transform);
}

function mapScalar(
  value: Exclude<WireJson, null | WireJson[]>,
  transform: Transform,
): WireJson {
  return typeof value === 'object' ? mapObject(value, transform) : value;
}

function mapObject(
  value: Record<string, WireJson>,
  transform: Transform,
): WireJson {
  const parsed = OverlayAction.safeParse(value);

  return parsed.success
    ? WireJson.parse({
        ...parsed.data,
        content: transform(parsed.data.content),
      })
    : mapActionContent(value, transform);
}
