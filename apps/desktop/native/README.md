# macOS sidebar glass

Argo keeps its Electron shell for Windows and Linux support. On macOS 26 and later, AppKit draws one glass view behind the floating sidebar. On macOS 15, or if the addon fails to load or attach, Electron uses the existing sidebar material.

## Build and packaging

The desktop build compiles the small Node-API addon from source. It requires the macOS 26 SDK and Node headers from the build's Node installation. Node-API lets the same addon load across Electron upgrades without an Electron-specific rebuild.

Vite builds and ad-hoc signs one binary with arm64 and x86_64 slices. Forge keeps the binary outside ASAR. The existing ASAR integrity and app-loading fuses stay enabled. When Argo adds Developer ID distribution signing, the app's signing pass must also sign the unpacked addon with that identity.

## AppKit API

The trial used `electron-liquid-glass` 1.1.1 and explored private AppKit setters. Those setters carry a Mac App Store review risk. Argo uses the public `NSGlassEffectView` class and its public corner radius property. The native view uses the same Electron window handle and view placement as the trial.

The Inspector needs its own independently positioned native view. It still uses the existing web glass material.
