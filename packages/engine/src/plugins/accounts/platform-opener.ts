import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WebUrl } from '@repo/contracts/plugins/account-calls';

const execute = promisify(execFile);

export async function openAuthorizeUrl(url: string): Promise<void> {
  WebUrl.parse(url);
  const opener = platformOpener(url);
  await execute(opener.program, opener.args);
}

type PlatformOpener = { program: string; args: string[] };

function platformOpener(url: string): PlatformOpener {
  switch (process.platform) {
    case 'darwin':
      return { program: 'open', args: [url] };
    case 'win32':
      return {
        program: 'rundll32.exe',
        args: ['url.dll,FileProtocolHandler', url],
      };
    default:
      return { program: 'xdg-open', args: [url] };
  }
}
