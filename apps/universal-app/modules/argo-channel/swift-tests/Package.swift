// swift-tools-version:5.9
import PackageDescription

// Runs the iOS record path (`../ios/ChannelCore.swift`, linked in) on the Mac: `swift test` in this directory.
let package = Package(
  name: "ChannelCore",
  platforms: [.macOS(.v13)],
  targets: [
    .target(name: "ChannelCore"),
    .testTarget(name: "ChannelCoreTests", dependencies: ["ChannelCore"]),
  ]
)
