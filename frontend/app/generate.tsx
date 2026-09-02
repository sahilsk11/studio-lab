import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createElement, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';

import {
  AppHeader,
  Body,
  Button,
  Callout,
  Caption,
  CaptionStrong,
  Container,
  GlassCard,
  Micro,
  Mono,
  Screen,
  Shimmer,
  StepRail,
  Title,
} from '@/components/ui';
import { fill, theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { confirm } from '@/lib/confirm';
import type { Project } from '@/types/project';

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function videoStatusCopy(project: Project, elapsedLabel: string, testMode: boolean): string {
  if (testMode) return 'Stitching the demo timeline together…';
  const clips =
    project.videoClipTotal && project.videoClipTotal > 1
      ? `clip ${project.videoClipIndex ?? 1} of ${project.videoClipTotal}`
      : null;
  switch (project.videoPhase) {
    case 'queued':
      return `Queued at OpenRouter${clips ? ` · ${clips}` : ''} · ${elapsedLabel}`;
    case 'rendering':
      return clips
        ? `Rendering ${clips} · ${elapsedLabel}. This usually takes a few minutes.`
        : `Rendering at OpenRouter · ${elapsedLabel}. This usually takes a few minutes.`;
    case 'downloading':
      return `Downloading the clip · ${elapsedLabel}`;
    case 'stitching':
      return `Stitching clips · ${elapsedLabel}`;
    default:
      return `Sending ${project.frames.length} keyframes to OpenRouter · ${elapsedLabel}`;
  }
}

function videoFooterLabel(project: Project, elapsedLabel: string, testMode: boolean): string {
  if (testMode) return 'Generating video…';
  if (project.videoClipTotal && project.videoClipTotal > 1) {
    const clip = `Clip ${project.videoClipIndex ?? 1} of ${project.videoClipTotal}`;
    if (project.videoPhase === 'rendering' || project.videoPhase === 'queued') {
      return `${clip} · ${elapsedLabel}`;
    }
  }
  switch (project.videoPhase) {
    case 'queued':
      return `Queued · ${elapsedLabel}`;
    case 'rendering':
      return `Rendering · ${elapsedLabel}`;
    case 'downloading':
      return `Downloading · ${elapsedLabel}`;
    case 'stitching':
      return `Stitching · ${elapsedLabel}`;
    default:
      return `Generating · ${elapsedLabel}`;
  }
}

export default function GenerateScreen() {
  const router = useRouter();
  const { project, hydrated, testMode, generateVideo, resetProject, refreshProject, error } =
    useProject();
  const { settings, accent, animate, tap } = useSettings();

  const hasVideo = Boolean(project.videoUri);
  const demoReady = testMode && project.videoReady;
  const [rendering, setRendering] = useState(false);
  const [done, setDone] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const startedRef = useRef<number | null>(null);

  const posterUri =
    project.videoPosterUri ??
    project.frames.find((f) => f.imageUri)?.imageUri ??
    project.scenes.find((s) => s.imageUri)?.imageUri;

  const frames = [...project.frames].sort((a, b) => a.order - b.order);
  const failed = Boolean(error || project.videoError) && !rendering && !hasVideo;

  if (rendering && startedRef.current == null) {
    startedRef.current = project.videoStartedAt ?? Date.now();
  }
  if (!rendering) startedRef.current = null;

  const elapsedMs = tick - (project.videoStartedAt ?? startedRef.current ?? tick);
  const elapsedLabel = formatElapsed(elapsedMs);
  const statusCopy = videoStatusCopy(project, elapsedLabel, testMode);

  async function renderVideo() {
    setRendering(true);
    setDone(false);
    startedRef.current = Date.now();
    try {
      await generateVideo();
      setDone(true);
      tap('success');
    } catch {
      setDone(false);
    } finally {
      setRendering(false);
    }
  }

  useEffect(() => {
    if (!hydrated) return;
    if (hasVideo || demoReady) {
      setRendering(false);
      setDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        await generateVideo();
        if (cancelled) return;
        setDone(true);
        tap('success');
      } catch {
        if (!cancelled) setDone(false);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Start once the project has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (hasVideo) {
      setRendering(false);
      setDone(true);
    }
  }, [hasVideo]);

  useEffect(() => {
    if (!rendering || testMode) return;
    const id = setInterval(() => void refreshProject(), 2000);
    return () => clearInterval(id);
  }, [rendering, testMode, refreshProject]);

  useEffect(() => {
    if (!rendering) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rendering]);

  async function handleStartOver() {
    const ok = await confirm({
      title: 'Start a new video?',
      message: 'Your current cast, scenes, frames and rendered images will be cleared on the server.',
      confirmLabel: 'Start over',
      destructive: true,
    });
    if (!ok) return;
    await resetProject();
    router.replace('/');
  }

  async function handleDownload() {
    if (!project.videoUri) return;
    await downloadMedia(project.videoUri, `${project.title || 'reel'}.mp4`);
  }

  async function handleShare() {
    if (!project.videoUri) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(project.videoUri);
        const blob = await res.blob();
      const file = new File([blob], `${project.title || 'reel'}.mp4`, { type: 'video/mp4' });
      await navigator.share({ files: [file], title: project.title || 'Studio Lab' });
        return;
      } catch {
        // Fall through to download.
      }
    }
    await handleDownload();
  }

  if (!hydrated) {
    return (
      <Screen header={<AppHeader title="Output" onBack={() => router.push('/frames')} />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppHeader title="Output" onBack={() => router.push('/frames')} />}
      footer={
        rendering ? (
          <Button
            label={videoFooterLabel(project, elapsedLabel, testMode)}
            size="lg"
            loading
            onPress={() => {}}
            disabled
          />
        ) : failed ? (
          <Button label="Retry video" icon="refresh-outline" size="lg" onPress={() => void renderVideo()} />
        ) : (
          <>
            <Button
              label="Download video"
              icon="download-outline"
              size="lg"
              disabled={!hasVideo}
              onPress={() => void handleDownload()}
            />
            <View style={styles.footerRow}>
              <Button
                label="Share"
                variant="secondary"
                icon="share-outline"
                disabled={!hasVideo}
                onPress={() => void handleShare()}
                style={styles.flex}
              />
              <Button
                label="Start over"
                variant="secondary"
                icon="refresh-outline"
                onPress={handleStartOver}
                style={styles.flex}
              />
            </View>
          </>
        )
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Container style={styles.stack}>
          <GlassCard radius={theme.radius.md}>
            <View style={styles.railInner}>
              <StepRail current="Video" />
            </View>
          </GlassCard>

          <View style={styles.heading}>
            <Title>
              {rendering ? 'Generating your reel' : failed ? 'Video failed' : 'Your reel is ready'}
            </Title>
            <Body style={styles.sub}>
              {rendering
                ? statusCopy
                : failed
                  ? error || project.videoError || 'Video generation failed.'
                  : hasVideo
                    ? `${project.frames.length} keyframes animated into a ${project.durationSec}s vertical video.`
                    : `${project.frames.length} keyframes stitched into a ${project.durationSec}s vertical video.`}
            </Body>
          </View>

          {failed ? (
            <Callout
              variant="error"
              title="Could not generate video"
              message={error || project.videoError || 'Try again.'}
            />
          ) : null}

          <Player
            posterUri={posterUri}
            videoUri={project.videoUri}
            rendering={rendering}
            statusLabel={statusCopy}
            animate={animate}
            glow={accent.glow}
            durationSec={project.durationSec}
          />

          {done ? (
            <>
              <View style={styles.statGrid}>
                <Stat icon="time-outline" label="Duration" value={`${project.durationSec}s`} />
                <Stat
                  icon="layers-outline"
                  label="Keyframes"
                  value={String(project.frames.length)}
                />
                <Stat icon="color-palette-outline" label="Style" value={project.style} />
                <Stat icon="resize-outline" label="Format" value="9:16" />
              </View>

              <GlassCard radius={theme.radius.lg}>
                <View style={styles.timelineHeader}>
                  <CaptionStrong>Timeline</CaptionStrong>
                  {settings.showCosts ? (
                    <Mono>${project.totalCost.toFixed(2)} total</Mono>
                  ) : null}
                </View>

                {frames.map((frame, i) => (
                  <View key={frame.id} style={styles.segRow}>
                    <Text style={styles.segIndex}>{String(i + 1).padStart(2, '0')}</Text>
                    <Caption style={styles.segName} numberOfLines={1}>
                      {frame.action}
                    </Caption>
                    <Ionicons name="checkmark-circle" size={15} color={theme.success} />
                  </View>
                ))}
              </GlassCard>
            </>
          ) : null}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function Player({
  posterUri,
  videoUri,
  rendering,
  statusLabel,
  animate,
  glow,
  durationSec,
}: {
  posterUri?: string;
  videoUri?: string;
  rendering: boolean;
  statusLabel: string;
  animate: boolean;
  glow: string;
  durationSec: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const showVideo = Boolean(videoUri) && !rendering;

  useEffect(() => {
    if (!rendering || !animate) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rendering, animate, pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });

  return (
    <View style={styles.playerWrap}>
      <Animated.View
        style={[
          styles.playerGlow,
          {
            backgroundColor: glow,
            opacity: rendering ? glowOpacity : 0.5,
          },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.player, theme.shadow.xl]}>
        {showVideo ? (
          <HtmlVideo src={videoUri!} poster={posterUri} />
        ) : (
          <>
            {posterUri ? (
              <Image
                source={{ uri: posterUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.playerEmpty} />
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.72)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />

            {rendering ? (
              <>
                <Shimmer />
                <View style={styles.playerCenter}>
                  <View style={styles.spinnerWell}>
                    <Ionicons name="sparkles" size={20} color={theme.text} />
                  </View>
                  <Caption style={styles.playerStatus} numberOfLines={4}>
                    {statusLabel}
                  </Caption>
                </View>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play video"
                style={styles.playerCenter}
                onPress={() => {}}>
                <View style={[styles.playButton, theme.shadow.lg]}>
                  <LinearGradient
                    colors={theme.metal.chrome}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={theme.metal.convex}
                    locations={[0, 0.45, 0.72, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons
                    name="play"
                    size={24}
                    color={theme.textOnMetal}
                    style={styles.playIcon}
                  />
                </View>
              </Pressable>
            )}

            {!rendering ? (
              <View style={styles.playerFooter}>
                <View style={styles.scrubTrack}>
                  <View style={styles.scrubFill} />
                </View>
                <View style={styles.playerMetaRow}>
                  <Mono color={theme.textSecondary}>0:00</Mono>
                  <Mono color={theme.textSecondary}>
                    0:{String(durationSec).padStart(2, '0')}
                  </Mono>
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.bezel} pointerEvents="none" />
      </View>
    </View>
  );
}

function HtmlVideo({ src, poster }: { src: string; poster?: string }) {
  return createElement('video', {
    src,
    poster,
    controls: true,
    playsInline: true,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#000',
    },
  });
}

async function downloadMedia(uri: string, filename: string) {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // Fall through to opening the URL.
  }
  await Linking.openURL(uri);
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <GlassCard radius={theme.radius.md} style={styles.stat}>
      <View style={styles.statInner}>
        <Ionicons name={icon} size={14} color={theme.textTertiary} />
        <Micro style={styles.statLabel}>{label}</Micro>
        <CaptionStrong numberOfLines={1}>{value}</CaptionStrong>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
  },
  stack: {
    gap: theme.space.lg,
  },
  railInner: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.sm,
  },
  heading: {
    gap: theme.space.sm,
  },
  sub: {
    maxWidth: 460,
  },
  playerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.sm,
  },
  playerGlow: {
    position: 'absolute',
    width: 260,
    height: 380,
    borderRadius: 190,
    ...Platform.select({
      web: { filter: 'blur(60px)' },
      default: {},
    }),
  },
  player: {
    width: '100%',
    maxWidth: 288,
    aspectRatio: 9 / 16,
    maxHeight: 460,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.bgSunken,
  },
  playerEmpty: {
    ...fill,
    backgroundColor: '#10131C',
  },
  bezel: {
    ...fill,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.glass.borderActive,
  },
  playerCenter: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.md,
  },
  spinnerWell: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.borderStrong,
  },
  playerStatus: {
    fontSize: 12.5,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.space.lg,
    maxWidth: 220,
  },
  playButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playIcon: {
    marginLeft: 3,
  },
  playerFooter: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: theme.space.lg,
    gap: 7,
  },
  scrubTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  scrubFill: {
    width: '0%',
    height: '100%',
    backgroundColor: '#fff',
  },
  playerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 120,
  },
  statInner: {
    padding: theme.space.lg,
    gap: 5,
  },
  statLabel: {
    color: theme.textQuaternary,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.glass.border,
  },
  segIndex: {
    fontFamily: theme.font.mono,
    fontSize: 11.5,
    color: theme.textQuaternary,
  },
  segName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: theme.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
});
