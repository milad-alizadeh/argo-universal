import { runPluginCommand } from '@argo/plugin-kit/cli';
import { productCompatibility } from '@repo/contracts/product-identity';

process.exitCode = await runPluginCommand(
  process.argv.slice(2),
  (line) => void process.stdout.write(`${line}\n`),
  `${productCompatibility.command} plugin`,
);
