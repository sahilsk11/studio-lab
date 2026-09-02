import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Body, BrandMark, Button, Container, Screen, Title } from '@/components/ui';
import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <Screen>
        <Container style={styles.wrap}>
          <BrandMark size={44} />
          <Title>This screen doesn't exist</Title>
          <Body style={styles.sub}>
            The page you were looking for isn't part of this reel.
          </Body>
          <Button
            label="Back to Reel"
            icon="arrow-back"
            inline
            onPress={() => router.replace('/')}
          />
        </Container>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.lg,
    padding: theme.space.xl,
  },
  sub: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
