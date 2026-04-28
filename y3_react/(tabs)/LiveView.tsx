// (tabs)/LiveView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, useColorScheme, Pressable } from 'react-native';
import { AudioContext, AudioRecorder, AudioManager, AudioBuffer, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import SampleTurboModule from '../specs/NativeSampleModule';
import { styles } from '../styles';

const FRAME_SIZE = 480;
const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 1;
const MAX_AMPLITUDE = 32768;
const RAMP_TIME = 0.005; // 5ms ramp
const RAMP_SAMPLES = SAMPLE_RATE * RAMP_TIME;

AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: [],
});

const recorder = new AudioRecorder();

var startTime = 0;
var totalFrameTime = 0;
var frameCount = 0;

const window = Array<number>(FRAME_SIZE).fill(1);
for (let i = 0; i < RAMP_SAMPLES; i++) {
  window[i] = i / RAMP_SAMPLES;
}
for (let i = FRAME_SIZE - RAMP_SAMPLES; i < FRAME_SIZE; i++) {
  window[i] = (FRAME_SIZE - i) / RAMP_SAMPLES
}

export default function App() {
  // TODO : implement nice colorscheme stuff
  //const colorScheme = useColorScheme();

  const context = useRef<AudioContext | null>(null);
  if (!context.current) {
    context.current = new AudioContext({ sampleRate: SAMPLE_RATE });
  }

  var audioBufferQueue = useRef<AudioBufferQueueSourceNode | null>(null);
  if (!audioBufferQueue.current) {
    audioBufferQueue.current = context.current.createBufferQueueSource();
  }

  const [averageFrameTime, setAverageFrameTime] = useState(0);

  useEffect(() => {

    if (context.current === null) { return }
    if (audioBufferQueue.current === null) { return }
    audioBufferQueue.current.connect(context.current.destination);
    audioBufferQueue.current.start();

    var raw = new Array<number>(FRAME_SIZE);
    const tempFloat32 = new Float32Array(FRAME_SIZE);
    const frame = context.current.createBuffer(CHANNEL_COUNT, FRAME_SIZE, SAMPLE_RATE);

    // callback for processing data from microphone
    recorder.onAudioReady(
      {
        sampleRate: SAMPLE_RATE,
        bufferLength: FRAME_SIZE,
        channelCount: CHANNEL_COUNT,
      },
      ({ buffer }) => {
        startTime = Date.now();
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          // convert from TypedArray to Array and scale
          for (let i = 0; i < FRAME_SIZE; i++) {
            raw[i] = buffer.getChannelData(c)[i] * MAX_AMPLITUDE;
          }
          // process
          raw = SampleTurboModule.rnnoise_process_frame_wrapper(raw, "processed");
          // convert back and scale down
          for (let i = 0; i < FRAME_SIZE; i++) {
            tempFloat32[i] = (raw[i] / MAX_AMPLITUDE) * window[i];
          }
          // prepare for queueing
          frame.copyToChannel(tempFloat32, c);
        }
        frameCount++;
        // send to queue
        if (audioBufferQueue.current !== null) {
          audioBufferQueue.current.enqueueBuffer(frame);
        }
        totalFrameTime += (Date.now() - startTime);
      }
    );

    return () => {
      if (audioBufferQueue.current !== null) {
        recorder.clearOnAudioReady();
        audioBufferQueue.current.clearBuffers();
      }
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

    // create denoise model before just in case
    SampleTurboModule.rnnoise_init_wrapper();
    const result = recorder.start();
    if (result.status === 'error') {
      SampleTurboModule.rnnoise_destroy_wrapper();
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
    setAverageFrameTime(totalFrameTime / frameCount);
    SampleTurboModule.rnnoise_destroy_wrapper();
    console.log(result);
    if (result.status === 'success') {
      audioBufferQueue.current?.clearBuffers();
      setIsRecording(false);
      await AudioManager.setAudioSessionActivity(false);
    }
  };



  return (
    <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center' }}>
      <Pressable style={styles.pressableButton} onPress={isRecording ? stopRecording : startRecording}>
        <Text style={styles.buttonText}>{isRecording ? "Stop" : "Start Playback"} </Text>
      </Pressable>
      <Text style={styles.numbers}>Frames Processed: {frameCount}</Text>
      <Text style={styles.numbers}>{averageFrameTime}</Text>
    </View>
  );
}
