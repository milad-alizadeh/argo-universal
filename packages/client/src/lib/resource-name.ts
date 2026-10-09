export function resourceName(uri: string): string {
  const path = uri.replace(/\/$/, '');
  return path.slice(path.lastIndexOf('/') + 1) || uri;
}
