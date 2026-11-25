// Node has no expo-file-system; these stand in so a module that builds its disk handles at load can be loaded.
export class File {}

export class Directory {}

export const Paths = { cache: '/cache' };
