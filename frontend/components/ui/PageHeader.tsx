import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import { Body, Eyebrow, Title } from './Typography';

export type PageStat = { label: string; value: string };

/** Shared title block used at the top of the white content panel. */
export function PageHeader({
  title,
  subtitle,
  stats,
  right,
}: {
  title: string;
  subtitle?: string;
  stats?: PageStat[];
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Title style={styles.title}>{title}</Title>
        {subtitle ? <Body style={styles.subtitle}>{subtitle}</Body> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {!right && stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Eyebrow>{stat.label}</Eyebrow>
              <Body style={styles.statValue} numberOfLines={1}>
                {stat.value}
              </Body>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.space.lg,
    paddingBottom: theme.space.lg,
  },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
  },
  subtitle: { maxWidth: 560 },
  right: { flexShrink: 0 },
  stats: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.space.xl,
    paddingTop: 4,
  },
  stat: { gap: 3, minWidth: 56, alignItems: 'flex-end' },
  statValue: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
});
