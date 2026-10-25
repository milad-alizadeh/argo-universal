// One text file in the Project, with the three measures the Code Map draws.
export interface CodeFile {
  path: string;
  // Area: the file's line count.
  lines: number;
  // Colour: lines with a branch (`if`, `case`, `catch`, `while`, `for`, `&&`, `||`, `??`); lexical, not cyclomatic complexity.
  branches: number;
  // Shade: how many of the last commits changed the file.
  touches: number;
}

// A rectangle in the scene's own units, which the App scales to fit its frame.
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A file placed by the treemap.
export interface Tile extends CodeFile, Bounds {}
