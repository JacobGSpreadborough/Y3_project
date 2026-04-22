import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { AudioRecorder, AudioManager } from 'react-native-audio-api';

AudioManager.setAudioSessionOptions({
	iosCategory: 'record',
	iosMode: 'default',
	iosOptions: [],
});

const recorder = new AudioRecorder();

// Enables recording to file with default configuration
recorder.enableFileOutput();

const recorderView: React.FC = () => {
	const [isRecording, setIsRecording] = useState(false);

	const onStart = async () => {
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
	};

	const onStop = () => {
		if (!isRecording) {
			return;
		}

		const result = recorder.stop();
		console.log(result);
		setIsRecording(false);
		AudioManager.setAudioSessionActivity(false);
	};

	return (
		<View>
			<Pressable onPress={isRecording ? onStop : onStart}>
				<Text>{isRecording ? 'Stop' : 'Record'}</Text>
			</Pressable>
		</View>
	);
};

export default recorderView;
