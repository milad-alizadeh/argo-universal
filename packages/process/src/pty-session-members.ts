import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const inspectProcess = promisify(execFile);

export type PtySessionMember = { pid: number; group: number };

// Darwin's ps masks the session field. Read the POSIX session ID of each live process.
const darwinSessions = `
sid = Integer(ARGV.fetch(0))
IO.popen(["/bin/ps", "-A", "-o", "pid=,stat="]) do |table|
  table.each_line do |line|
    pid, state = line.split
    next if state.start_with?("Z")
    begin
      id = Integer(pid)
      puts "#{id} #{Process.getpgid(id)}" if Process.getsid(id) == sid
    rescue Errno::ESRCH
      # The process exited between ps and getsid.
    end
  end
end
exit 1 unless $?.success?
`;

async function darwinMembers(session: number): Promise<string[]> {
  const { stdout } = await inspectProcess(
    '/usr/bin/ruby',
    ['--disable-gems', '-e', darwinSessions, String(session)],
    { env: { NODE_ENV: process.env.NODE_ENV } },
  );

  return stdout.trim().split('\n').filter(Boolean);
}

async function linuxMembers(session: number): Promise<string[]> {
  const { stdout } = await inspectProcess('/bin/ps', [
    '-A',
    '-o',
    'pid=,pgid=,sid=,stat=',
  ]);

  return stdout.split('\n').flatMap((line): string[] => {
    const [pid, group, sid, state] = line.trim().split(/\s+/);

    return Number(sid) === session && state && !state.startsWith('Z')
      ? [`${pid} ${group}`]
      : [];
  });
}

export async function ptySessionMembers(
  session: number,
): Promise<PtySessionMember[]> {
  const rows = await (process.platform === 'darwin'
    ? darwinMembers(session)
    : linuxMembers(session));

  return rows.map((row) => {
    const [pid, group] = row.trim().split(/\s+/).map(Number);

    if (!pid || !group || pid < 1 || group < 1)
      throw new Error('PTY session member could not be observed');

    return { pid, group };
  });
}
