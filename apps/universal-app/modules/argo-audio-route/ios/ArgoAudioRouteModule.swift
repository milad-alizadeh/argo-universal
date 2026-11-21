import AVFoundation
import ExpoModulesCore

// SPIKE (latency on a phone, docs/research/voice-mode.md): the call's audio route, which react-native-webrtc leaves to the app.
public final class ArgoAudioRouteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ArgoAudioRoute")

    // A call starts on the earpiece. Moves it to the loudspeaker, and leaves headphones and Bluetooth alone.
    Function("preferLoudspeaker") { () -> String in
      let session = AVAudioSession.sharedInstance()

      let onEarpiece = session.currentRoute.outputs.contains { output in
        output.portType == .builtInReceiver
      }

      if onEarpiece {
        try? session.overrideOutputAudioPort(.speaker)
      }

      return Self.routeName(of: session)
    }

    // Where the sound plays now, such as "Speaker" or the headphones' name.
    Function("route") { () -> String in
      Self.routeName(of: AVAudioSession.sharedInstance())
    }
  }

  private static func routeName(of session: AVAudioSession) -> String {
    session.currentRoute.outputs.map { $0.portName }.joined(separator: ", ")
  }
}
