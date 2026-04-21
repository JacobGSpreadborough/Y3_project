// App.tsx
import React from 'react';
import { View, Button, Text, TextInput, useColorScheme } from 'react-native';
import { AudioContext } from 'react-native-audio-api';
import SampleTurboModule from './specs/NativeSampleModule';

const FRAME_SIZE = 480;


export default function App() {
  const [value, setValue] = React.useState('');
  const [reversedValue, setReversedValue] = React.useState('');

  const handlePlay = async () => {
    // get audio buffer from file
    const context = new AudioContext();
    const input = await context.decodeAudioData(require("./assets/audio/input.wav"));
    const sampleRate = input.sampleRate;
    const length = input.length;
    // add 0s to the end of the file to ensure clean windows
    const padding = length % FRAME_SIZE;
    // buffer to hold input and output
    const audioBuffer = context.createBuffer(1, length + padding, sampleRate);
    audioBuffer.copyToChannel(input.getChannelData(0), 0);
    const outputBuffer = context.createBuffer(1, length + padding, sampleRate);

    var frame = new Float32Array(FRAME_SIZE);
    // initialize model
    console.log("initializing model");
    SampleTurboModule.rnnoise_init_wrapper();
    console.log("model initialized");
    console.log(SampleTurboModule.rnnoise_checkhealth());
    // iterate through frames
    for (let i = 0; i < length; i += FRAME_SIZE) {
      // slice FRAME_SIZE samples from the input buffer into a number[], process with turbomodule, and write into Float32Array
      // TODO : refactor into less than 80 columns                            | <-- 80 columns
      console.log(audioBuffer.getChannelData(0).slice(i, i + FRAME_SIZE).length);
      frame.set(SampleTurboModule.rnnoise_process_frame_wrapper(Array.from(audioBuffer.getChannelData(0).slice(i, i + FRAME_SIZE))), 0);
      // write to output buffer
      // TODO: same buffer for input and output
      outputBuffer.copyToChannel(frame, 0, i);
    }
    console.log("audio processed, destroying model");
    // free model
    SampleTurboModule.rnnoise_destroy_wrapper();
    console.log("model destroyed, starting playback");
    // play back the audio file
    const playerNode = context.createBufferSource();
    playerNode.buffer = outputBuffer;
    playerNode.connect(context.destination);
    playerNode.start();

  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button onPress={handlePlay} title="Reverse" />
      <Text>Reversed text: {reversedValue}</Text>
      <TextInput placeholder='enter text' onChangeText={setValue} value={value} />
    </View>
  );
}

