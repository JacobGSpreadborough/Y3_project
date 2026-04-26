import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  pressableButton: {
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 40,
    width: 150,
    borderRadius: 100,
    alignItems: 'center',
  },
  nonPressableButton: {
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
    height: 40,
    width: 150,
    borderRadius: 100,
    alignItems: 'center',
  },
  nonPressableButtonText: {
    color: '#AAAAAA',
  },
  buttonText: {
    color: '#007AFF',
  },
  numbers: {
    fontVariant: ['tabular-nums'],
  },
});
