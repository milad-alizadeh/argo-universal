// React Native Web paints the image as a CSS background, url("…"), so a data URI's raw quotes end the url early and nothing draws; percent-encoding its SVG keeps it whole.
export function cssSafeUri(uri: string): string {
  const prefix = 'data:image/svg+xml,';

  if (!uri.startsWith(prefix)) return uri;

  try {
    return (
      prefix + encodeURIComponent(decodeURIComponent(uri.slice(prefix.length)))
    );
  } catch {
    return uri;
  }
}
