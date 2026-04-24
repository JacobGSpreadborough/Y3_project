// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, useColorScheme, Pressable } from 'react-native';
import { AudioContext, AudioRecorder, AudioManager, AudioBuffer } from 'react-native-audio-api';
import SampleTurboModule from './specs/NativeSampleModule';

const FRAME_SIZE = 480;
const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 1;

AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: [],
});

const recorder = new AudioRecorder();

function Float32ArrayToNumberArray(input: Float32Array, output: Array<number>) {
  if (input.length !== output.length) {
    console.error("Incompatible lengths of input: ", input.length, "output: ", output.length);
  }
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] * 32768;
  }
}

function NumberArrayToFloat32Array(input: Array<number>, output: Float32Array) {
  if (input.length !== output.length) {
    console.error("Incompatible lengths of input: ", input.length, "output: ", output.length);
  }
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / 32768;
  }
}

export default function App() {
  // TODO : implement nice colorscheme stuff
  //const colorScheme = useColorScheme();

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

    // initalizing the model before recording starts just in case
    SampleTurboModule.rnnoise_init_wrapper();
    const result = recorder.start();
    if (result.status === 'error') {
      SampleTurboModule.rnnoise_destroy_wrapper();
      console.warn(result.message);
      return;
    }

    if (context.current !== null) {
      audioBufferQueue.connect(context.current.destination);
      audioBufferQueue.start();
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
      SampleTurboModule.rnnoise_destroy_wrapper();
    }
  };



  return (
    <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center' }}>
      <Pressable onPress={isRecording ? stopRecording : startRecording}>
        <Text>{isRecording ? "Stop" : "Start Playback"} </Text>
      </Pressable>
    </View>
  );
}
