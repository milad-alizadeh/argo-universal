# The Feed draws Charts from Agent messages

Agents need to show data in an explanation and see how it will look before they send it. The Feed uses the same kit `Chart` that Plugins use. See [ADR-0028](0028-plugins-draw-svg-charts-and-canvases-on-every-app.md).

## Decision

- An Agent message stores Chart data as strict JSON in a `chart` fence. The format uses the kit's data fields and excludes actions. After the fence closes, the Feed draws the Chart. If drawing fails, the Feed shows the source. This follows the inline source model of [ADR-0058](0058-the-feed-draws-mermaid-fences-as-diagrams.md). Other Markdown surfaces show the fence as source.
- The App checks the data and draws the Chart locally on iOS, Android, web, and macOS. It uses the existing Victory Native renderer, theme, and accessible data table. The message needs only its source to draw when the Session reopens offline.
- A short Argo instruction tells Agents to preview the fence before sending it. The preview Operation's catalog entry and documentation explain how to call it and give a copyable example. Agents can send a fence with or without access to the Operation.
- The Operation checks the exact fence that the Agent plans to send. It returns field errors for invalid data. For valid data it uses the web Feed renderer at the requested width and theme. It returns a cropped PNG after the Chart and its labels draw. If the image is unavailable, the result says that data validation passed and explains why it could not return an image.
- The desktop App draws the draft in an isolated renderer that uses its web build. If the desktop renderer is unavailable, the Operation still checks the input. A narrow Feed width is the default. The Agent can request another width or theme. The result identifies the platform, width, and theme it rendered.
- The Operation sends the PNG to the Agent for inspection. The Tool call record keeps only the preview status. The published Chart lives in the Agent message as source.
- The initial Feed integration checks cover all four Apps. Each preview captures only the web render.

Chart is the first format. SVG and Canvas have separate design decisions for markup checks and gestures in the Feed.
