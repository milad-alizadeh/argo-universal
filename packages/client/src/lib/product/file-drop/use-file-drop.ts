// Files dropped on a Session's pane, and how many folders were dropped with them, which can't be attached.
export interface DroppedFiles {
  files: File[];
  folders: number;
}

export interface FileDropOptions {
  // The element files are dropped on, by its `nativeID`.
  targetId: string;
  onDropFiles?: (dropped: DroppedFiles) => void;
}

// Phones have no file drag and drop, so files are never over the window.
export function useFileDrop(_options: FileDropOptions): boolean {
  return false;
}
