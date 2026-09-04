import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  Body,
  Button,
  Callout,
  Caption,
  CaptionStrong,
  Container,
  GlassCard,
  Mono,
  ProgressRail,
  Screen,
  Title,
  useDesktopLayout,
} from '@/components/ui';
import { SignInGate, useAuthGate } from '@/components/ui/SignInGate';
import { fill, theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import type { Project, VideoPhase } from '@/types/project';

const PAGE_PAD = theme.space.xl;

const PHASE_PROGRESS: Record<VideoPhase, number> = {
  idle: 0,
  queued: 12,
  rendering: 52,
  downloading: 76,
  stitching: 90,
  ready: 100,
  error: 0,
};

export default function WatchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { project, hydrated, testMode, error, generateVideo, refreshProject } = useProject();
  const { tap } = useSettings();
  const { authReady, requiresSignIn, promptSignIn } = useAuthGate();
  const needsSignIn = requiresSignIn && !testMode;
  const [rendering, setRendering] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quickChange, setQuickChange] = useState<string | null>(null);
  const started = useRef(false);
  const promptedSignIn = useRef(false);

  const phase = project.videoPhase ?? (project.videoReady ? 'ready' : 'idle');
  const activePhase = ['queued', 'rendering', 'downloading', 'stitching'].includes(phase);
  const ready = project.videoReady || Boolean(project.videoUri) || phase === 'ready';
  const failed = phase === 'error' || Boolean(project.videoError) || (Boolean(error) && !activePhase && !ready);
  const posterUri =
    project.videoPosterUri ??
    [...project.frames].sort((a, b) => a.order - b.order).find((frame) => frame.imageUri)?.imageUri ??
    project.scenes.find((scene) => scene.imageUri)?.imageUri;
  const isWide = width >= 720;
  const desktop = useDesktopLayout();
  const darkMobile = !isWide;

  useEffect(() => {
    if (!hydrated || !authReady || ready || activePhase || failed || started.current || needsSignIn) return;
    if (project.frames.length === 0) {
      router.replace('/scenes');
      return;
    }
    started.current = true;
    void renderVideo();
  }, [hydrated, authReady, ready, activePhase, failed, project.frames.length, needsSignIn, router]);

  useEffect(() => {
    if (!hydrated || !authReady || !needsSignIn || ready || promptedSignIn.current) return;
    promptedSignIn.current = true;
    promptSignIn();
  }, [hydrated, authReady, needsSignIn, ready, promptSignIn]);

  useEffect(() => {
    if ((!rendering && !activePhase) || testMode) return;
    const id = setInterval(() => void refreshProject(), 2000);
    return () => clearInterval(id);
  }, [rendering, activePhase, testMode, refreshProject]);

  useEffect(() => {
    if (!rendering && !activePhase) return;
    const startedAt = project.videoStartedAt ?? Date.now();
    setElapsed(Date.now() - startedAt);
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [rendering, activePhase, project.videoStartedAt]);

  async function renderVideo() {
    if (needsSignIn) {
      promptSignIn();
      return;
    }
    setRendering(true);
    try {
      await generateVideo();
      tap('success');
    } catch {
      tap('error');
    } finally {
      setRendering(false);
    }
  }

  async function handleDownload() {
    if (!project.videoUri) return;
    await downloadMedia(project.videoUri, `${safeName(project.title || 'reel')}.mp4`);
  }

  if (!hydrated || (!testMode && !authReady)) {
    return (
      <Screen currentStep="Watch">
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  const progress = ready ? 100 : PHASE_PROGRESS[phase] || (rendering ? 8 : 0);
  const status = phaseCopy(project, rendering, elapsed, testMode);

  return (
    <Screen
      currentStep="Watch"
      sidebarDark={darkMobile}
      contentStyle={darkMobile ? styles.mobileScreen : undefined}>
      <ScrollView
        style={darkMobile ? styles.mobileScreen : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, darkMobile && styles.scrollDark]}>
        <Container style={styles.stack}>
          {!needsSignIn || ready ? (
            <View style={styles.topActions}>
              {ready ? (
                <Button
                  label="Download"
                  icon="download-outline"
                  size="sm"
                  variant="secondary"
                  inline
                  disabled={!project.videoUri}
                  onPress={() => void handleDownload()}
                />
              ) : (
                <Mono>{progress}%</Mono>
              )}
            </View>
          ) : null}

          {failed && !needsSignIn ? (
            <Callout
              variant="error"
              title="The render stopped"
              message={project.videoError || error || 'The video could not be completed.'}
            />
          ) : null}

          {needsSignIn && !ready ? (
            <SignInGate
              title="Sign in to generate your video"
              message="Your storyboard is ready. Sign in to start the final render — your project will be saved to your account."
            />
          ) : (
            <>
              <View style={[styles.editorial, isWide ? styles.editorialWide : styles.editorialNarrow]}>
                <VideoPlayer
                  posterUri={posterUri}
                  videoUri={project.videoUri}
                  ready={ready}
                  rendering={rendering || activePhase}
                  progress={progress}
                  durationSec={project.durationSec}
                />

                <View style={styles.sidePanel}>
                  <View style={styles.titleBlock}>
                    <Mono color={darkMobile ? '#C8BCAF' : undefined}>
                      {ready ? 'FINAL CUT' : 'RENDERING FINAL CUT'}
                    </Mono>
                    <Title color={darkMobile ? '#FFFDF8' : undefined}>
                      {failed
                        ? 'This version needs another pass'
                        : ready
                          ? `Done — ${project.durationSec} seconds`
                          : 'Building your reel'}
                    </Title>
                    <Body color={darkMobile ? '#D5CBC0' : undefined}>{status}</Body>
                  </View>

                  {!ready && !failed ? (
                    <GlassCard tone="raised" radius={theme.radius.md}>
                      <View style={styles.renderStatus}>
                        <View style={styles.renderHeader}>
                          <CaptionStrong>{phaseLabel(phase)}</CaptionStrong>
                          <Mono>{progress}%</Mono>
                        </View>
                        <ProgressRail value={progress} total={100} />
                        <Caption>
                          {project.videoClipTotal && project.videoClipTotal > 1
                            ? `Clip ${project.videoClipIndex ?? 1} of ${project.videoClipTotal}`
                            : `${project.frames.length} scenes in this cut`}
                        </Caption>
                      </View>
                    </GlassCard>
                  ) : null}

                  {ready ? (
                    <View style={styles.quickSection}>
                      <Mono color={darkMobile ? '#C8BCAF' : undefined}>QUICK CHANGES</Mono>
                      <View style={styles.quickChips}>
                        {['slower pacing', 'warmer light', 'tighter ending', 'more camera motion'].map((label) => (
                          <Pressable
                            key={label}
                            accessibilityRole="button"
                            accessibilityState={{ selected: quickChange === label }}
                            onPress={() => {
                              tap('light');
                              setQuickChange((current) => (current === label ? null : label));
                            }}
                            style={[
                              styles.quickChip,
                              darkMobile && styles.quickChipDark,
                              quickChange === label && styles.quickChipSelected,
                            ]}>
                            <Text
                              style={[
                                styles.quickChipText,
                                darkMobile && styles.quickChipTextDark,
                                quickChange === label && styles.quickChipTextSelected,
                              ]}>
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    {failed ? (
                      <Button
                        label="Retry render"
                        icon="refresh-outline"
                        size="lg"
                        loading={rendering}
                        onPress={() => void renderVideo()}
                      />
                    ) : ready ? (
                      <>
                        <Button
                          label={quickChange ? `Make “${quickChange}” version` : 'Make another version'}
                          icon="sparkles"
                          size="lg"
                          loading={rendering}
                          onPress={() => void renderVideo()}
                        />
                        <Button
                          label="Download 1080×1920"
                          icon="download-outline"
                          size="md"
                          variant="secondary"
                          disabled={!project.videoUri}
                          onPress={() => void handleDownload()}
                        />
                      </>
                    ) : (
                      <Button label={phaseLabel(phase)} size="lg" loading disabled onPress={() => {}} />
                    )}
                  </View>
                </View>
              </View>

              {ready ? (
                <GlassCard radius={theme.radius.lg}>
                  <View style={styles.deliveryRow}>
                    <DeliveryStat icon="time-outline" label="Duration" value={`${project.durationSec}s`} />
                    <DeliveryStat icon="resize-outline" label="Format" value="9:16" />
                    <DeliveryStat icon="images-outline" label="Scenes" value={String(project.frames.length)} />
                    <DeliveryStat icon="color-palette-outline" label="Look" value={project.style} />
                  </View>
                </GlassCard>
              ) : null}
            </>
          )}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function VideoPlayer({
  posterUri,
  videoUri,
  ready,
  rendering,
  progress,
  durationSec,
}: {
  posterUri?: string;
  videoUri?: string;
  ready: boolean;
  rendering: boolean;
  progress: number;
  durationSec: number;
}) {
  const [playing, setPlaying] = useState(false);
  const canEmbed = Platform.OS === 'web' && Boolean(videoUri) && ready;

  return (
    <View style={[styles.player, theme.shadow.xl]}>
      {canEmbed ? (
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
            <LinearGradient colors={[theme.bgElevated, theme.bgSunken]} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.74)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cutBadge}>
            <Text style={styles.cutBadgeText}>{rendering ? `render · ${progress}%` : 'final cut'}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause video' : 'Play video'}
            disabled={!ready}
            onPress={() => {
              if (videoUri && Platform.OS !== 'web') {
                void Linking.openURL(videoUri);
                return;
              }
              setPlaying((value) => !value);
            }}
            style={styles.playerCenter}>
            <View style={[styles.playButton, !ready && styles.playButtonMuted]}>
              <Ionicons
                name={rendering ? 'sparkles' : playing ? 'pause' : 'play'}
                size={25}
                color={theme.textOnAccent}
                style={!playing && !rendering ? styles.playOffset : undefined}
              />
            </View>
          </Pressable>

          <View style={styles.playerControls}>
            <View style={styles.scrubTrack}>
              <View style={[styles.scrubFill, { width: `${rendering ? progress : playing ? 47 : 0}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Mono color={theme.text}>{playing ? `0:${String(Math.round(durationSec * 0.47)).padStart(2, '0')}` : '0:00'}</Mono>
              <Mono color={theme.text}>0:{String(durationSec).padStart(2, '0')}</Mono>
            </View>
          </View>
        </>
      )}
      <View style={styles.playerBezel} />
    </View>
  );
}

function HtmlVideo({ src, poster }: { src: string; poster?: string }) {
  return createElement('video', {
    src,
    poster,
    controls: true,
    playsInline: true,
    style: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' },
  });
}

function DeliveryStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.deliveryStat}>
      <Ionicons name={icon} size={15} color={theme.textTertiary} />
      <View style={styles.deliveryCopy}>
        <Mono>{label.toUpperCase()}</Mono>
        <CaptionStrong numberOfLines={1}>{value}</CaptionStrong>
      </View>
    </View>
  );
}

function phaseLabel(phase: VideoPhase): string {
  switch (phase) {
    case 'queued': return 'Queued';
    case 'rendering': return 'Rendering scenes';
    case 'downloading': return 'Downloading clips';
    case 'stitching': return 'Stitching final cut';
    case 'ready': return 'Ready';
    case 'error': return 'Render failed';
    default: return 'Preparing render';
  }
}

function phaseCopy(project: Project, rendering: boolean, elapsedMs: number, testMode: boolean): string {
  const elapsed = formatElapsed(elapsedMs);
  if (project.videoReady || project.videoUri || project.videoPhase === 'ready') {
    return 'Your vertical reel is ready to watch. Change one direction for another version, or download the final file.';
  }
  if (project.videoPhase === 'error' || project.videoError) {
    return 'The cut is still intact. Retry to render the same scenes again.';
  }
  if (testMode) return `Assembling the demo timeline · ${elapsed}`;
  if (project.videoClipTotal && project.videoClipTotal > 1) {
    return `${phaseLabel(project.videoPhase ?? 'idle')} · clip ${project.videoClipIndex ?? 1} of ${project.videoClipTotal} · ${elapsed}`;
  }
  return `${phaseLabel(project.videoPhase ?? (rendering ? 'queued' : 'idle'))} · ${elapsed}`;
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function safeName(value: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'reel';
}

async function downloadMedia(uri: string, filename: string) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    }
  } catch {
    // Opening the source still gives native users a working save/share path.
  }
  await Linking.openURL(uri);
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mobileScreen: { backgroundColor: '#302C27' },
  scroll: {
    paddingHorizontal: PAGE_PAD,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
  },
  scrollDark: { backgroundColor: '#302C27' },
  stack: { gap: theme.space.xl },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editorial: { alignItems: 'center', gap: theme.space.xxl },
  editorialWide: { flexDirection: 'row', justifyContent: 'center', alignItems: 'stretch' },
  editorialNarrow: { flexDirection: 'column' },
  player: {
    width: '100%',
    maxWidth: 310,
    aspectRatio: 9 / 16,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.bgSunken,
  },
  playerBezel: {
    ...fill,
    pointerEvents: 'none',
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  cutBadge: {
    position: 'absolute',
    left: theme.space.lg,
    top: theme.space.lg,
    borderRadius: theme.radius.xs,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(6,7,11,0.72)',
  },
  cutBadgeText: {
    color: theme.text,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  playerCenter: { ...fill, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,247,252,0.92)',
    ...theme.shadow.lg,
  },
  playButtonMuted: { opacity: 0.68 },
  playOffset: { marginLeft: 3 },
  playerControls: { position: 'absolute', left: theme.space.lg, right: theme.space.lg, bottom: theme.space.lg, gap: 8 },
  scrubTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.34)' },
  scrubFill: { height: '100%', borderRadius: 2, backgroundColor: theme.warning },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sidePanel: { flex: 1, width: '100%', maxWidth: 330, justifyContent: 'center', gap: theme.space.xl },
  titleBlock: { gap: theme.space.sm },
  renderStatus: { padding: theme.space.lg, gap: theme.space.md },
  renderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickSection: { gap: theme.space.md },
  quickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
  },
  quickChipDark: { borderColor: '#6A6056', backgroundColor: '#3A342F' },
  quickChipSelected: { borderColor: theme.warning, backgroundColor: theme.warningDim },
  quickChipText: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 13 },
  quickChipTextDark: { color: '#E4D9CC' },
  quickChipTextSelected: { color: theme.warning },
  actions: { gap: theme.space.md },
  deliveryRow: { flexDirection: 'row', flexWrap: 'wrap', padding: theme.space.lg, gap: theme.space.lg },
  deliveryStat: { flexGrow: 1, flexBasis: 125, flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  deliveryCopy: { flex: 1, minWidth: 0, gap: 3 },
});
