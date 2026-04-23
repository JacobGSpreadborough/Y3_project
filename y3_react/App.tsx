// App.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  channelCount: 2,
  format: FileFormat.Wav,
});

export default function App() {
  // TODO : implement nice colorscheme stuff
  //const colorScheme = useColorScheme();

  const context = useRef<AudioContext | null>(null);
  if (!context.current) {
    context.current = new AudioContext({ sampleRate: SAMPLE_RATE });
  }

  const audioBufferQueue = context.current.createBufferQueueSource({ pitchCorrection: false });
  const frame = context.current.createBuffer(2, 480, 48_000);
  // callback for processing data from microphone
  useEffect(() => {
    recorder.onAudioReady(
      {
        sampleRate: 48_000,
        bufferLength: 480, // 0.1s of audio each batch
        channelCount: 2,
      },
      ({ buffer }) => {
        console.log("frame size: ", buffer.length);
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const temp = new Float32Array(SampleTurboModule.rnnoise_process_frame_wrapper(Array.from(buffer.getChannelData(c))));
          frame.copyToChannel(temp, c);
        }
        audioBufferQueue.enqueueBuffer(frame);
      }
    );

    return () => {
      recorder.clearOnAudioReady();
    };
  }, []);

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
        <Text>{isRecording ? "Stop" : "Start Recording"} </Text>
      </Pressable>
    </View>
  );
}
