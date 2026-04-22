// App.tsx
import React, { useState } from 'react';
import { View, Button, Text, useColorScheme, Pressable } from 'react-native';
import { AudioContext, AudioRecorder, AudioManager, FileFormat, AudioBuffer } from 'react-native-audio-api';
import SampleTurboModule from './specs/NativeSampleModule';

const FRAME_SIZE = 480;
const SAMPLE_RATE = 48_000;

AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: [],
});
const recorder = new AudioRecorder();

// set up recording output specs
recorder.enableFileOutput({
  channelCount: 1,
  format: FileFormat.Wav,
});

function denoiseBuffer(inputBuffer: AudioBuffer | null, context: AudioContext): AudioBuffer {
  if (inputBuffer === null) {
    // TODO: implement
    throw "buffer is null";
  }
  const sampleRate = inputBuffer.sampleRate;
  const length = inputBuffer.length;
  // add 0s to the end of the file to ensure clean windows
  const padding = length % FRAME_SIZE;
  // buffer to hold audioBuffer
  const audioBuffer = context.createBuffer(1, length + padding, sampleRate);
  audioBuffer.copyToChannel(inputBuffer.getChannelData(0), 0);
  const outputBuffer = context.createBuffer(1, length + padding, sampleRate);

  var frame = new Float32Array(FRAME_SIZE);

  // initialize model
  SampleTurboModule.rnnoise_init_wrapper();

  console.log("denoising file");

  // iterate through frames
  for (let i = 0; i < length; i += FRAME_SIZE) {
    // slice FRAME_SIZE samples from the audioBuffer buffer into a number[], process with turbomodule, and write into Float32Array
    // TODO : refactor into less than 80 columns                            | <-- 80 columns
    frame.set(SampleTurboModule.rnnoise_process_frame_wrapper(Array.from(audioBuffer.getChannelData(0).slice(i, i + FRAME_SIZE))), 0);
    // write to output buffer
    // TODO: same buffer for audioBuffer and output should work but doesn't for some reason
    outputBuffer.copyToChannel(frame, 0, i);
  }
  // free model
  SampleTurboModule.rnnoise_destroy_wrapper();
  console.log("file denoised");

  return outputBuffer;
}

function playBuffer(playbackBuffer: AudioBuffer | null, context: AudioContext) {
  if (playbackBuffer === null) throw ("buffer is null");
  console.log("context:", context.state);
  console.log("playbackBuffer:  ", playbackBuffer);
  const playerNode = context.createBufferSource();
  playerNode.buffer = playbackBuffer;
  playerNode.connect(context.destination);
  console.log("playback started");

  playerNode.start();
}

export default function App() {
  // TODO : implement nice colorscheme stuff
  //const colorScheme = useColorScheme();
  //let audioBuffer: AudioBuffer;

  const context = new AudioContext(
    { sampleRate: SAMPLE_RATE });

  const [isRecording, setIsRecording] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const startRecording = async () => {
    if (isRecording) {
      return;
    }

    // Make sure the permissions are granted
    const permissions = await AudioManager.requestRecordingPermissions();

    if (permissions !== 'Granted') {
      console.warn('Permissions are not granted');
      return;
    }

    // Activate audio session
    const success = await AudioManager.setAudioSessionActivity(true);

    if (!success) {
      console.warn('Could not activate the audio session');
      return;
    }

    const result = recorder.start();
    if (result.status === 'error') {
      console.warn(result.message);
      return;
    }

    console.log('Recording started');
    setIsRecording(true);
  }

  const stopRecording = async () => {
    if (!isRecording) {
      return;
    }

    const result = recorder.stop();
    console.log(result);
    if (result.status === 'success') {
      setIsRecording(false);
      await AudioManager.setAudioSessionActivity(false);
      const decoded = await context.decodeAudioData(result.path);
      setAudioBuffer(denoiseBuffer(decoded, context))
    }
  };



  return (
    <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center' }}>
      <Pressable onPress={isRecording ? stopRecording : startRecording}>
        <Text>{isRecording ? "Stop" : "Start Recording"} </Text>
      </Pressable>
      <Button title="Play" onPress={() => playBuffer(audioBuffer, context)} />
    </View>
  );
}
