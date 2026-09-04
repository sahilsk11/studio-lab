import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { Button } from './Button';

export type ActionSpec = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
};

/** Fixed prev / next bar at the bottom of the content panel. */
export function ActionBar({
  previous,
  next,
  extra,
}: {
  previous?: ActionSpec | null;
  next?: ActionSpec | null;
  extra?: React.ReactNode;
}) {
  if (!previous && !next && !extra) return null;

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {previous ? (
          <Button
            label={previous.label}
            icon="arrow-back"
            variant="secondary"
            size="md"
            inline
            disabled={previous.disabled}
            loading={previous.loading}
            onPress={previous.onPress}
          />
        ) : null}
      </View>

      <View style={styles.trailing}>
        {extra}
        {next?.hint ? <Text style={styles.hint}>{next.hint}</Text> : null}
        {next ? (
          <Button
            label={next.label}
            iconRight="arrow-forward"
            variant="primary"
            size="md"
            inline
            disabled={next.disabled}
            loading={next.loading}
            onPress={next.onPress}
            style={styles.next}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingTop: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  side: {
    flexShrink: 0,
    minWidth: 0,
  },
  trailing: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.space.md,
    flexWrap: 'wrap',
  },
  hint: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 12.5,
  },
  next: { minWidth: 148 },
});
