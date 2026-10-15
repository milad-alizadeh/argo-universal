import { z } from 'zod';
import type { InstallPorts } from '../install/ports';

const Release = z.object({
  assets: z.array(
    z.object({ name: z.string(), digest: z.string().nullable().optional() }),
  ),
});

type DigestInput = { url: string; ports: InstallPorts; signal: AbortSignal };

type GithubAsset = { api: string; name: string };

const githubAsset = (archive: string): GithubAsset | null => {
  const url = new URL(archive);

  const match = /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/.exec(
    url.pathname,
  );

  if (url.hostname !== 'github.com' || !match) return null;
  const [, owner, repo, tag, asset] = match;

  return {
    api: `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
    name: decodeURIComponent(String(asset)),
  };
};

export const githubDigest = async (
  input: DigestInput,
): Promise<string | undefined> => {
  const asset = githubAsset(input.url);

  if (!asset) return undefined;

  try {
    return await readDigest(input, asset);
  } catch {
    input.signal.throwIfAborted();

    return undefined;
  }
};

const readDigest = async (
  input: DigestInput,
  asset: GithubAsset,
): Promise<string | undefined> => {
  const bytes = await input.ports.download(asset.api, input.signal);
  const release = Release.parse(JSON.parse(new TextDecoder().decode(bytes)));
  const digest = release.assets.find(({ name }) => name === asset.name)?.digest;

  return digest?.replace(/^sha256:/, '');
};
