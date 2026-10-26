export interface PathParts {
  folder: string;
  name: string;
}

// Splits after the last slash, so the name stays whole while the folder gives up its start.
export function splitPath(path: string): PathParts {
  const slash = path.lastIndexOf('/');

  return { folder: path.slice(0, slash + 1), name: path.slice(slash + 1) };
}
