// The Inspector's width before any drag: wide enough for a diff, and narrowed to fit where the window cannot hold it.
export const defaultInspectorWidth = 600;

// The width a drag of the Inspector's divider left, with the page's width beside it, which becomes the content's floor while the Inspector is open.
export interface InspectorWidth {
  width: number;
  contentFloor?: number;
}

export const defaultInspector: InspectorWidth = {
  width: defaultInspectorWidth,
};
