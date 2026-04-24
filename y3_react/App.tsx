// App.tsx
import React, { useState, useEffect } from 'react';
import { View, Button, Text, useColorScheme, Pressable } from 'react-native';
import { AudioContext, AudioRecorder, AudioManager, AudioBuffer } from 'react-native-audio-api';
import SampleTurboModule from './specs/NativeSampleModule';

const FRAME_SIZE = 480;
const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 1;

AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: ['defaultToSpeaker'],
});

const recorder = new AudioRecorder();

// create and full array to smooth out frames being sent to output buffer
const hann = Array<number>(FRAME_SIZE);
for (let i = 0; i < FRAME_SIZE; i++) {
  hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)));
}

// convert and scale [-1,1] TypedArray to [-32767, 32768] Array
function Float32ArrayToNumberArray(input: Float32Array, output: Array<number>) {
  if (input.length !== output.length) {
    console.warn("If you just pressed 'stop playback' you can safely ignore this error");
    console.error("Incompatible lengths of input: ", input.length, "output: ", output.length);
  }
  for (let i = 0; i < input.length; i++) {
    output[i] = (input[i] * 32768);
  }
}

// convert and scale [-32767, 32768] Array to [-1,1] TypedArray
// also adds Hanning window to minimize clicks between windows
function NumberArrayToFloat32Array(input: Array<number>, output: Float32Array) {
  if (input.length !== output.length) {
    console.warn("If you just pressed 'stop playback' you can safely ignore this error");
    console.error("Incompatible lengths of input: ", input.length, "output: ", output.length);
  }
  for (let i = 0; i < input.length; i++) {
    output[i] = (input[i] / 32768) * hann[i];
  }
}
>>>>>>> tmp

function denoiseBuffer(input: AudioBuffer | null, context: AudioContext): AudioBuffer {
  if (input === null) {
    // TODO: implement
    throw "buffer is null";
  }
  const numChannels = input.numberOfChannels;
  const sampleRate = input.sampleRate;
  const length = input.length;
  // add 0s to the end of the file to ensure clean windows
  const padding = length % FRAME_SIZE;
  // buffer to hold audioBuffer
  const audioBuffer = context.createBuffer(numChannels, length + padding, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    audioBuffer.copyToChannel(input.getChannelData(c), c);
  }
  const output = context.createBuffer(numChannels, length + padding, sampleRate);

  var frame = new Float32Array(FRAME_SIZE);

  // initialize model
  SampleTurboModule.rnnoise_init_wrapper();

  console.log("denoising file");

  // iterate through frames for both channels
  for (let c = 0; c < numChannels; c++) {
    for (let i = 0; i < length; i += FRAME_SIZE) {
      // slice FRAME_SIZE samples from the audioBuffer buffer into a number[], process with turbomodule, and write into Float32Array
      // TODO : refactor into less than 80 columns                            | <-- 80 columns
      frame.set(SampleTurboModule.rnnoise_process_frame_wrapper(Array.from(audioBuffer.getChannelData(c).slice(i, i + FRAME_SIZE))));
      // write to output buffer
      // TODO: same buffer for audioBuffer and output should work but doesn't for some reason
      output.copyToChannel(frame, c, i);
    }
  }
  // free model
  SampleTurboModule.rnnoise_destroy_wrapper();
  console.log("file denoised");

  return output;
}

async function playBuffer(audioBuffer: AudioBuffer | null, context: AudioContext) {
  if (audioBuffer === null) throw ("buffer is null");

  await context.resume();
  const playerNode = context.createBufferSource();
  playerNode.buffer = audioBuffer;
  playerNode.connect(context.destination);
  console.log("playback started");

  playerNode.start();
}

export default function App() {
  // TODO : implement nice colorscheme stuff
  //const colorScheme = useColorScheme();

<<<<<<< HEAD
  const context = new AudioContext(
    { sampleRate: SAMPLE_RATE });
=======
  const context = useRef<AudioContext | null>(null);
  if (!context.current) {
    context.current = new AudioContext({ sampleRate: SAMPLE_RATE });
  }

  const audioBufferQueue = context.current.createBufferQueueSource({ pitchCorrection: false });
  const tempNumber = new Array<number>(FRAME_SIZE);
  const tempFloat32 = new Float32Array(FRAME_SIZE);
  const frame = context.current.createBuffer(CHANNEL_COUNT, FRAME_SIZE, SAMPLE_RATE);
  // callback for processing data from microphone
  useEffect(() => {
    recorder.onAudioReady(
      {
        sampleRate: SAMPLE_RATE,
        bufferLength: FRAME_SIZE, // 10ms windows
        channelCount: CHANNEL_COUNT,
      },
      ({ buffer }) => {
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          // convert and prepare data
          Float32ArrayToNumberArray(buffer.getChannelData(c), tempNumber);
          // process data, convert and prepare for queueing
          NumberArrayToFloat32Array(SampleTurboModule.rnnoise_process_frame_wrapper(tempNumber), tempFloat32);
          frame.copyToChannel(tempFloat32, c);
        }
        audioBufferQueue.enqueueBuffer(frame);
      }
    );

    return () => {
      recorder.clearOnAudioReady();
    };
  }, []);
>>>>>>> tmp

  const [isRecording, setIsRecording] = useState(false);

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
        <Text>{isRecording ? "Stop" : "Start Playback"} </Text>
      </Pressable>
      <Button title="Play" onPress={() => playBuffer(audioBuffer, context)} />
    </View>
  );
}
