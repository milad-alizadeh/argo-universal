// Files dropped on the Composer, and how many folders were dropped with them, which can't be attached.
export interface DroppedFiles {
  files: File[];
  folders: number;
}

export interface FileDropOptions {
  // The element files are dropped on, by its `nativeID`.
  targetId: string;
  onDropFiles?: (dropped: DroppedFiles) => void;
}

// Phones have no file drag and drop.
export function useFileDrop(_options: FileDropOptions): void {}
