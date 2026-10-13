import { spawn } from 'node:child_process';
if (process.argv[2] === 'descendant') {
  const child = spawn(
    process.execPath,
    ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'],
    { stdio: 'ignore' },
  );
  process.stdout.write(`descendant:${child.pid}\n`);
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else {
  process.stdin.setRawMode(true);
  process.stdout.write(
    `tty:${process.stdin.isTTY}:${process.stdout.columns}:${process.stdout.rows}:${process.env.LOGIN_MODE}\n`,
  );
  process.stdout.on('resize', () =>
    process.stdout.write(
      `size:${process.stdout.columns}:${process.stdout.rows}\n`,
    ),
  );
  process.stdin.on('data', (input) => {
    process.stdout.write(`input:${input.toString('hex')}\n`);
    if (input.includes(13)) process.exit(0);
  });
}
