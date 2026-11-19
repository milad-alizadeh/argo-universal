# Plugin assets

A Plugin resolves media on the Server through `argo.assets.resolve`. The result contains only `{ pluginId, hash, format }`.
The App uses this reference to load bytes from the Server. Remote URLs and credentials stay on the Server.

## Resolve a Plugin file

```js
const avatar = await argo.assets.resolve({ asset: 'assets/avatar.png' });
```

The path is relative to the Plugin folder. The Server refuses absolute paths, traversal, and symlinks that escape that folder.
Assets must be regular files with one hard link.

## Resolve remote media

```js
const token = await argo.secrets.get('github-token');
const avatar = await argo.assets.resolve({
  url: 'https://avatars.githubusercontent.com/u/123',
  headers: { Authorization: `Bearer ${token}` },
});
```

The manifest must declare a fetch Capability for each required host, including its port.
The Server checks HTTPS, the host, and resolved addresses on every redirect.
Credentials follow same-origin redirects. The Server removes authorization and cookie headers on a redirect to another origin.
The asset response never forwards upstream headers such as `Set-Cookie`.

The call rejects upstream errors, unsupported media types, and compressed responses.
Each asset can contain at most 64 MiB. Remote requests use the same 30-second deadline as `argo.fetch`.
A Plugin reload, crash, or disable action aborts its remote requests.

## Play a video or a sound

`Video` and `Audio` take a resolved reference as their `source`; a URL or a Plugin path is refused on the wire.

```jsx
const clip = await argo.assets.resolve({ asset: 'assets/clip.mp4' });

<Video source={clip} accessibilityLabel="Release demo" />;
```

## Load a reference in an App

`pluginAssetPath(reference)`, from `@repo/contracts/plugins/assets`, returns the Server route:

```text
/plugin-assets/<pluginId>/<sha256>.<format>
```

The App resolves this path against its Connection's Server address, using the existing `serverHttpUrl` helper.
It never uses the Plugin's remote URL as a media source.
The route accepts GET and HEAD. It supports ETags, conditional requests, and single byte ranges for media seeking.

The Server stores complete assets outside the Plugin's writable data folder.
Each URL names immutable bytes by their SHA-256 hash and media format.
Responses use `Cache-Control: private, max-age=31536000, immutable`.
Resolving changed content returns a new hash. Existing hashes remain unchanged across Server restarts.
A stopped Plugin cannot serve its cached assets until it starts again.

Supported formats are PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, MP4, WebM, MOV, MP3, M4A, OGG, WAV, AAC, and FLAC.
SVG uses the separate sanitized `Svg` wire component described in ADR-0028.

## Authentication status

The route uses the current Host/Origin guards and loopback Server binding.
Pairing-token support is deferred by the owner's decision for #986 (2026-10-18), consistent with ADR-0002 and ADR-0022.
It requires the future pairing and authentication protocol before a Paired Device can use it.

The integration tests exercise the real Engine, Plugin host, filesystem, and HTTP route.
They prove byte delivery and HTTP behavior. They do not prove image decoding or native playback on physical Devices.
