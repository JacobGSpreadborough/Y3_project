// (tabs)/LiveView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, useColorScheme, Pressable } from 'react-native';
import { AudioContext, AudioRecorder, AudioManager, AudioBuffer, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import SampleTurboModule from '../specs/NativeSampleModule';
import { styles } from '../styles';

const FRAME_SIZE = 480;
const OVERLAP = 0.5;
const HOP_SIZE = Math.floor(FRAME_SIZE * (1 - OVERLAP));
const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 1;
const MAX_AMPLITUDE = 32768;

AudioManager.setAudioSessionOptions({
  iosCategory: 'playAndRecord',
  iosMode: 'default',
  iosOptions: ['defaultToSpeaker'],
});

const recorder = new AudioRecorder();

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

  useEffect(() => {

    if (context.current === null) { return }
    if (audioBufferQueue.current === null) { return }
    audioBufferQueue.current.connect(context.current.destination);
    audioBufferQueue.current.start();

    const raw = new Array<number>(HOP_SIZE);
    var overlap = new Array<number>(HOP_SIZE).fill(0);
    var tail = new Array<number>(HOP_SIZE).fill(0);
    var currentFrame = new Array<number>(FRAME_SIZE);
    var tempFloat32 = new Float32Array(HOP_SIZE);
    var frame = context.current.createBuffer(CHANNEL_COUNT, HOP_SIZE, SAMPLE_RATE);

    // callback for processing data from microphone
    recorder.onAudioReady(
      {
        sampleRate: SAMPLE_RATE,
        bufferLength: HOP_SIZE,
        channelCount: CHANNEL_COUNT,
      },
      ({ buffer }) => {
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          for (let i = 0; i < HOP_SIZE; i++) {
            // convert from Float32Array to Array<number> and scale to [-32767, 32768]
            raw[i] = buffer.getChannelData(c)[i] * MAX_AMPLITUDE;
            // combine overlap from last hop with data from this one
            currentFrame[i] = overlap[i];
            // store new data to overlap with next hop
            overlap[i] = raw[i];
          }
          // finish populating the current frame
          for (let i = HOP_SIZE; i < FRAME_SIZE; i++) {
            currentFrame[i] = raw[i - HOP_SIZE];
          }

          // process current frame
          currentFrame = SampleTurboModule.rnnoise_process_frame_wrapper(currentFrame, "processed");

          for (let i = 0; i < HOP_SIZE; i++) {
            // add previous tail to this frame
            currentFrame[i] += tail[i];
            // store new tail for next hop
            tail[i] = currentFrame[HOP_SIZE + i];
            //convert to format suitable for playback
            tempFloat32[i] = currentFrame[i] / MAX_AMPLITUDE;
          }

          // prepare for playback
          frame.copyToChannel(tempFloat32, c);
        }
        // send to queue
        if (audioBufferQueue.current !== null) {
          audioBufferQueue.current.enqueueBuffer(frame);
        }
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
    // preload 1 second of silence to prevent underrun
    if (context.current !== null) {
      const silence = context.current.createBuffer(CHANNEL_COUNT, FRAME_SIZE * 10, SAMPLE_RATE)
      audioBufferQueue.current?.enqueueBuffer(silence);
    }
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
    </View>
  );
}
