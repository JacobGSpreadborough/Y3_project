import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import './native/rnnoise.dart';
import 'dart:typed_data';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:audio_session/audio_session.dart';
import 'package:permission_handler/permission_handler.dart';

const FRAME_SIZE = 480;
const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 2;
const CODEC = Codec.pcmFloat32WAV;

void main() {
  runApp(const MyApp());
}

int dataChunkOffset(Uint8List bytes) {
  for (int i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] == 0x64 &&
        bytes[i + 1] == 0x61 &&
        bytes[i + 2] == 0x74 &&
        bytes[i + 3] == 0x61) {
      return i + 8;
    }
  }
  return -1;
}

Future<List<Float32List>> readWav(String path) async {
  var file = File(path);
  var bytes = await file.readAsBytes();
  final offset = dataChunkOffset(bytes);
  final channels = CHANNEL_COUNT;
  var samples = bytes.buffer.asFloat32List(offset);
  final length = samples.length ~/ channels;
  print(samples.length);
  print(length);
  print(length / SAMPLE_RATE);
  final out = List.generate(channels, (_) => Float32List(length));
  for (int i = 0; i < length; i++) {
    final channel = i % channels;
    final channelIndex = i ~/ channels;
    out[channel][channelIndex] = samples[i];
  }
  return out;
}

List<Float32List> denoiseBuffer(
  List<Float32List> input,
  List<Float32List> dest,
) {
  print("denoising");
  // remove data that doesn't fit in a window, FIX: fix this later
  // we'll only lose <10 ms of data
  final frame = Float32List(FRAME_SIZE);

  // iterate across channels
  for (int c = 0; c < input.length; c++) {
    final padding = input[c].length % FRAME_SIZE;
    for (int i = 0; i < input[c].length - padding; i += FRAME_SIZE) {
      frame.setRange(0, FRAME_SIZE, input[c], i);
      Rnnoise.rnnoise_process_frame_wrapper(frame);
      dest[c].setRange(i, i + FRAME_SIZE, frame);
    }
  }
  print("denoising completed");
  return dest;
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'File',
      theme: ThemeData(colorScheme: .fromSeed(seedColor: Colors.white)),
      home: const MyHomePage(title: 'File'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;
  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final player = FlutterSoundPlayer();
  final recorder = FlutterSoundRecorder();
  late List<Float32List> rawBuffer;
  late List<Float32List> denoisedBuffer;
  StreamController<Food> playerController = StreamController<Food>();
  var filePath;
  bool _isRecording = false;
  bool _playbackReady = false;
  bool _denoisedReady = false;

  void startRecording() async {
    var status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      print("Permission status: $status");
      await openAppSettings();
      return;
    }
    await recorder.openRecorder();
    await recorder.startRecorder(
      sampleRate: SAMPLE_RATE,
      toFile: "recording.wav",
      numChannels: CHANNEL_COUNT,
      codec: CODEC,
      audioSource: AudioSource.defaultSource,
    );
    setState(() {
      _isRecording = true;
    });
  }

  void stopRecording() async {
    filePath = await recorder.stopRecorder();
    setState(() {
      _isRecording = false;
    });
    print("recording saved to $filePath");
    rawBuffer = await readWav(filePath);
    setState(() {
      _playbackReady = true;
    });
    denoisedBuffer = List<Float32List>.filled(
      2,
      Float32List(rawBuffer[0].length),
    );
    denoiseBuffer(rawBuffer, denoisedBuffer);
    setState(() {
      _denoisedReady = true;
    });
  }

  void playBuffer(List<Float32List> audioBuffer) async {
    await player.startPlayerFromStream(
      codec: Codec.pcmFloat32,
      interleaved: false,
      numChannels: CHANNEL_COUNT,
      sampleRate: SAMPLE_RATE,
      bufferSize: audioBuffer.length,
    );
    await player.feedF32FromStream(audioBuffer);
  }

  void stopPlaying() {
    player.stopPlayer();
  }

  Future<void> init() async {
    // request record permission
    final session = await AudioSession.instance;
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
    print("opening player");
    await player.openPlayer();
  }

  @override
  void initState() {
    super.initState();

    init();
    print("initializing");
    Rnnoise.rnnoise_init_wrapper();
  }

  @override
  void dispose() {
    recorder.closeRecorder();
    player.closePlayer();
    Rnnoise.rnnoise_destroy_wrapper();

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.outline,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: .center,
          children: [
            ElevatedButton(
              onPressed: () {
                _isRecording ? stopRecording() : startRecording();
              },
              child: Text(_isRecording ? "Stop Recording" : "Start Recording"),
            ),
            ElevatedButton(
              onPressed: _playbackReady ? () => playBuffer(rawBuffer) : null,
              child: Text("Raw Audio"),
            ),
            ElevatedButton(
              onPressed: _denoisedReady
                  ? () => playBuffer(denoisedBuffer)
                  : null,
              child: Text("Denoised Audio"),
            ),
          ],
        ),
      ),
    );
  }
}
