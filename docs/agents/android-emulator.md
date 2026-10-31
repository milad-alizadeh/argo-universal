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

- SIGTERM while the quickboot snapshot is saving crashes the emulator and writes a new dump, about 3 MB. The next boot then hits the dialog again. This is why retries kept failing.
- SIGTERM of an emulator hung in the dialog also writes a dump.
- `emu kill`, headless or windowed, writes no dump.

## Workarounds that do not help

Cloning the AVD, `-wipe-data` and `-gpu swiftshader_indirect` all leave the crash database untouched, so each one fails the same way. Do not use them to get around the hang.

## Recovering a stuck emulator

1. Kill the stuck process by the PID in your `emu.pid`. Do not use `pkill -f`.
2. Run one headless launch. It clears the pending dumps.
3. Stop that launch with `adb -s emulator-<port> emu kill`.

After that, windowed launches work again. The issue also lists answering the dialog on the owner's desktop as an alternative. That is the owner's call.

## Ports and sharing

- Use a port no other agent is using. Two emulators must never share one.
- Boot one emulator at a time and no more than two, named after yourself. Delete your own AVD when you are done.
- Never delete another AVD's `hardware-qemu.ini.lock` or `multiinstance.lock`. Deleting them fixed nothing. A clone that still carries a stale `hardware-qemu.ini.lock` boots fine, so stale locks are not the cause.

## Open questions

These are not settled. Do not present them as known.

- Why SIGTERM during a quickboot snapshot save crashes the emulator. It is an emulator bug, not tied to Argo's code.
- Whether every earlier hang was this dialog. The symptom matches, but the launch flags were not recorded.
- Whether two agents booting the same AVD break each other. It was not reproduced, and the behaviour of `multiinstance.lock` under that case is unmeasured.
