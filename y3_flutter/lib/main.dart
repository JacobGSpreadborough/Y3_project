import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';
import 'package:record/record.dart';
import 'package:flutter/material.dart';
import 'dart:math';

final sampleRate = 16000;
final pi = 3.1415926;

// playback array
var bytes = List<int>.filled(48000, 0);
void fillBuffer() {
  for (var i = 0; i < 48000; i++) {
    bytes[i] = ((sin(2 * pi * i / 48000)) * 32000).toInt();
  }
}

final player = AudioPlayer();
final recorder = AudioRecorder();
final recordConfig = RecordConfig(
  encoder: AudioEncoder.pcm16bits,
  sampleRate: sampleRate,
  numChannels: 1,
  autoGain: false,
  echoCancel: false,
  noiseSuppress: false,
  streamBufferSize: 1024,
);

class audioBuffer extends StreamAudioSource {
  final List<int> bytes;
  audioBuffer(this.bytes);

  @override
  Future<StreamAudioResponse> request([int? start, int? end]) async {
    start ??= 0;
    end ??= bytes.length;
    return StreamAudioResponse(
      sourceLength: bytes.length,
      contentLength: end - start,
      offset: start,
      stream: Stream.value(bytes.sublist(start, end)),
      contentType: 'audio/mpeg',
    );
  }
}

Future<void> initAudio() async {
  final session = await AudioSession.instance;
  // 'speech' is ideal for constant playback such as audiobooks or podcasts
  // only other option is 'music'
  await session.configure(const AudioSessionConfiguration.speech());
  // listen and report errors from player
  player.errorStream.listen((e) {
    print("stream error $e");
  });
}

void startPlayback() async {
  fillBuffer();
  await player.setAudioSource(audioBuffer(bytes));
  player.play();
}

void startRecording() async {
  if (!await recorder.hasPermission()) {
    print("No microphone! Denied!");
  }
  final stream = await recorder.startStream(recordConfig);
  stream.listen((audioChunk) {
    print("audioChunk length:            ${audioChunk.length}");
    print("audioConfig streamBufferSize: ${recordConfig.streamBufferSize}");
  });
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
