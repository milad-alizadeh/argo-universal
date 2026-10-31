# Android emulator

A windowed Android emulator can hang before it starts: it idles at about 0.1% CPU and never registers with adb. The cause, diagnosed in [#1651](https://github.com/milad-alizadeh/argo-universal/issues/1651) on emulator 35.3.11.0 (arm64, API 35, hvf), is a modal crash-consent dialog, not load, disk, locks or the AVD. Boot headless, as below.

## Procedure

Set `<AVD>` to the AVD you own and pick a port from 5554 to 5584. adb only scans up to 5585.

```sh
SDK=~/Library/Android/sdk
$SDK/emulator/emulator -avd <AVD> -port 5584 -no-window -no-snapshot -no-audio > boot.log 2>&1 &
echo $! > emu.pid
until [ "$($SDK/platform-tools/adb -s emulator-5584 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 5; done
$SDK/platform-tools/adb -s emulator-5584 emu kill     # never SIGTERM or SIGKILL
```

Every adb command takes `-s emulator-<port>`. Never run a bare `adb devices`: it lists the owner's physical phone, `44081JEKB10620`, along with the emulators.

## Why `-no-window` is mandatory

A pending crash dump in `/tmp/android-$USER/emu-crash-35.3.11.db/completed/` makes a windowed launch run `CrashConsentProvider::showDialog` inside `QDialog::exec()`. `~/.android/analytics.settings` has `hasOptedIn:false`, so the emulator asks and waits for a click that no agent can give. The guest never starts and adb never sees the device. The process sits at about 0.1% CPU.

A headless launch skips that dialog and deletes the pending dumps.

## Stopping

Stop with `adb -s <serial> emu kill`, never a signal. Measured in #1651:

- SIGTERM while the quickboot snapshot is saving crashes the emulator and writes a new dump, about 3 MB. The next boot then hits the dialog again.
- SIGTERM of an emulator hung in the dialog also writes a dump. Killing a hung emulator is how the retries kept re-poisoning the next boot.
- `emu kill`, headless or windowed, writes no dump.

## Workarounds that do not help

Cloning the AVD, `-wipe-data` and `-gpu swiftshader_indirect` all leave the crash database untouched, so none of them clears the dialog's cause.

## Recovering a stuck emulator

1. Kill the stuck process by the PID in your `emu.pid`.
2. Run one headless launch. It clears the pending dumps.
3. Stop that launch with `adb -s emulator-<port> emu kill`.

After that, windowed launches work again.

## Ports and sharing

- Use a port no other agent is using. Two emulators must never share one.
- Boot one emulator at a time, two at most. Delete your own AVD when you are done.
- Do not delete another AVD's `hardware-qemu.ini.lock` or `multiinstance.lock`. A clone that still carries a stale `hardware-qemu.ini.lock` boots fine, so stale locks are not the cause.

## Open questions

Not settled. Each is unknown until measured.

- Why SIGTERM during a quickboot snapshot save crashes the emulator.
- Whether every earlier hang was this dialog. The symptom matches, but the launch flags were not recorded.
- The dialog window itself was never seen; the cause is inferred from the stack trace and the dump behaviour.
- Whether two agents booting the same AVD break each other. It was not reproduced, and the behaviour of `multiinstance.lock` under that case is unmeasured.
