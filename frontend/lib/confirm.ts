import { Alert, Platform } from 'react-native';

/**
 * Destructive-action confirmation. react-native-web has no usable Alert, so
 * the browser falls back to window.confirm.
 */
export function confirm({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' &&
      window.confirm(message ? `${title}\n\n${message}` : title);
    return Promise.resolve(!!ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
