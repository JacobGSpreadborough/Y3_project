import 'package:audio_session/audio_session.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

final sampleRate = 16000;
final codec = Codec.pcm16;

const source = AudioSource.microphone;
final player = FlutterSoundPlayer();
final recorder = FlutterSoundRecorder();

Future<void> setupRecorder() async {
  await Permission.microphone.request();
  // in the future we may want to set isBGService to true
  await recorder.openRecorder();
  // we may not need this part
  await recorder.setSubscriptionDuration(const Duration(milliseconds: 10));
}

Future<void> setupPlayer() async {
  await player.openPlayer();
}

void startPlayback() async {
  await setupSession();
  await setupRecorder();
  await setupPlayer();
  await player.startPlayerFromStream(
    codec: codec,
    sampleRate: sampleRate,
    interleaved: false,
    bufferSize: 1024,
    numChannels: 1,
  );

  await recorder.startRecorder(
    codec: codec,
    audioSource: source,
    toStreamInt16: player.int16Sink,
    sampleRate: sampleRate,
    numChannels: 1,
    enableNoiseSuppression: false,
    enableVoiceProcessing: false,
    enableEchoCancellation: false,
  );
}

Future<void> setupSession() async {
  final session = await AudioSession.instance;
  // i HATE this
  await session.configure(
    AudioSessionConfiguration(
      avAudioSessionCategory: AVAudioSessionCategory.playAndRecord,
      avAudioSessionCategoryOptions:
          AVAudioSessionCategoryOptions.allowBluetooth |
          AVAudioSessionCategoryOptions.defaultToSpeaker,
      avAudioSessionMode: AVAudioSessionMode.spokenAudio,
      avAudioSessionRouteSharingPolicy:
          AVAudioSessionRouteSharingPolicy.defaultPolicy,
      avAudioSessionSetActiveOptions: AVAudioSessionSetActiveOptions.none,
      androidAudioAttributes: const AndroidAudioAttributes(
        contentType: AndroidAudioContentType.speech,
        flags: AndroidAudioFlags.none,
        usage: AndroidAudioUsage.voiceCommunication,
      ),
      androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
      androidWillPauseWhenDucked: true,
    ),
  );
}

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(
          child: IconButton(onPressed: startPlayback, icon: Icon(Icons.mic)),
        ),
      ),
    );
  }
}
