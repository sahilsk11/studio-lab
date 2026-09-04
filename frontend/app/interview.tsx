import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';

type Question = {
  id: 'feel' | 'setting' | 'cast' | 'ending';
  title: string;
  hint: string;
  multiple?: boolean;
  options: { label: string; detail: string }[];
};

const QUESTIONS: Question[] = [
  {
    id: 'feel',
    title: 'How should it feel?',
    hint: 'Choose the closest mood',
    options: [
      { label: 'Tense but funny', detail: 'pressure with a dry wink' },
      { label: 'Fast and electric', detail: 'pure momentum' },
      { label: 'Warm and playful', detail: 'soft stakes, bright energy' },
      { label: 'Cool and restrained', detail: 'quiet, graphic, precise' },
    ],
  },
  {
    id: 'setting',
    title: 'When is it set?',
    hint: 'Pick a time and atmosphere',
    options: [
      { label: 'Dusk, after rain', detail: 'wet streets and warm windows' },
      { label: 'Bright midday', detail: 'hard light and clear color' },
      { label: 'Deep night', detail: 'neon edges and deep shadows' },
      { label: 'A retro past', detail: 'period detail, no modern clutter' },
    ],
  },
  {
    id: 'cast',
    title: "Who's in it?",
    hint: 'Pick one or more',
    multiple: true,
    options: [
      { label: 'One lead', detail: 'carries the whole story' },
      { label: 'A witness', detail: 'someone reacts to the moment' },
      { label: 'An animal', detail: 'a silent scene-stealer' },
      { label: 'A whole crew', detail: 'three or more on screen' },
      { label: 'The customer', detail: 'waiting at the other end' },
      { label: 'No people', detail: 'objects and places only' },
    ],
  },
  {
    id: 'ending',
    title: 'How does it end?',
    hint: 'Give the last beat a shape',
    options: [
      { label: 'They make it', detail: 'a clean, satisfying release' },
      { label: 'One second late', detail: 'the joke lands at the door' },
      { label: 'Leave it hanging', detail: 'cut at peak tension' },
      { label: 'A surprise turn', detail: 'reframe the whole story' },
    ],
  },
];

type Answers = Record<Question['id'], string[]>;

const INITIAL_ANSWERS: Answers = {
  feel: ['Tense but funny'],
  setting: ['Dusk, after rain'],
  cast: [],
  ending: [],
};

export default function InterviewScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    hydrated,
    error,
    generateCast,
    generateAllCastImages,
  } = useProject();
  const { settings, tap } = useSettings();
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [creating, setCreating] = useState(false);

  const compact = width < 720;
  const answered = useMemo(
    () => QUESTIONS.filter((question) => answers[question.id].length > 0).length,
    [answers],
  );

  function choose(question: Question, option: string) {
    tap('light');
    setAnswers((current) => {
      if (!question.multiple) return { ...current, [question.id]: [option] };
      const selected = current[question.id];
      return {
        ...current,
        [question.id]: selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });
  }

  async function createCast() {
    if (creating) return;
    setCreating(true);
    try {
      await generateCast({ replace: true });
      tap('success');
      router.push('/cast');
      if (settings.autoGenerateImages) void generateAllCastImages();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen
      currentStep="Clarify project"
      loading={!hydrated}
      title="Make it specific"
      subtitle="Four questions. Then I start drawing the cast."
      stats={[{ label: 'Answered', value: `${answered}/4` }]}
      next={{
        label: answered === 4 ? 'Create cast' : `Answer ${4 - answered} more`,
        onPress: () => void createCast(),
        loading: creating,
        disabled: answered < 4 || creating,
      }}
      extra={
        <Button
          label="Pick for me"
          variant="ghost"
          size="md"
          inline
          loading={creating}
          disabled={creating}
          onPress={() => void createCast()}
        />
      }>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.sheet, compact && styles.sheetCompact]}>
        {QUESTIONS.map((question, index) => (
          <QuestionCard
            key={question.id}
            number={index + 1}
            question={question}
            selected={answers[question.id]}
            compact={compact}
            onChoose={(option) => choose(question, option)}
          />
        ))}
      </View>
    </Screen>
  );
}

function QuestionCard({
  number,
  question,
  selected,
  compact,
  onChoose,
}: {
  number: number;
  question: Question;
  selected: string[];
  compact: boolean;
  onChoose: (option: string) => void;
}) {
  return (
    <View
      style={[
        styles.question,
        compact && styles.questionCompact,
        selected.length > 0 && styles.questionAnswered,
      ]}>
      <View style={styles.questionHead}>
        <View style={[styles.questionNumber, selected.length > 0 && styles.questionNumberDone]}>
          {selected.length > 0 ? (
            <Ionicons name="checkmark" size={11} color={theme.surface} />
          ) : (
            <Text style={styles.questionNumberText}>{number}</Text>
          )}
        </View>
        <View style={styles.questionCopy}>
          <Text style={styles.questionTitle}>{question.title}</Text>
          <Text style={styles.questionHint}>{question.hint}</Text>
        </View>
      </View>

      <View style={styles.options}>
        {question.options.map((option) => {
          const active = selected.includes(option.label);
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChoose(option.label)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, active && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
              <View style={[styles.check, active && styles.checkSelected]}>
                {active ? <Ionicons name="checkmark" size={11} color={theme.surface} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: theme.danger, fontFamily: theme.font.sans, fontSize: 13, marginBottom: theme.space.md },
  sheet: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: theme.space.md },
  sheetCompact: { flexDirection: 'column', flexWrap: 'nowrap' },
  question: {
    width: '48%',
    flexGrow: 1,
    minWidth: 310,
    padding: theme.space.lg,
    gap: theme.space.lg,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
  },
  questionAnswered: { borderColor: theme.borderStrong },
  questionCompact: { width: '100%', minWidth: 0 },
  questionHead: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  questionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  questionNumberDone: { backgroundColor: theme.info, borderColor: theme.info },
  questionNumberText: { color: theme.accentDark, fontFamily: theme.font.mono, fontSize: 10 },
  questionCopy: { flex: 1, gap: 1 },
  questionTitle: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  questionHint: { color: theme.textTertiary, fontFamily: theme.font.sans, fontSize: 12 },
  options: { gap: theme.space.sm },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bgElevated,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  optionSelected: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionLabel: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  optionLabelSelected: { color: theme.accentDark },
  optionDetail: {
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  checkSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  pressed: { opacity: 0.62 },
});
