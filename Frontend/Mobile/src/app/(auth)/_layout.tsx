import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function AuthLayout() {
  return (
    <KeyboardProvider>
    <Stack>
        
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />

    </Stack>
    </KeyboardProvider>
  );
}