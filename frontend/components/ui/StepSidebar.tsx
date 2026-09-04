import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { Step } from '@/types/project';
import { STEPS } from '@/types/project';

import { SidebarFooter } from './AuthControls';
import { BrandButton } from './Brand';
import { Eyebrow } from './Typography';
import { ProjectPicker } from './ProjectPicker';
import { StepRail } from './StepRail';

export { DESKTOP_BREAKPOINT, SIDEBAR_WIDTH, useDesktopLayout } from './layout';

function SidebarLabel({ children, trailing }: { children: string; trailing?: string }) {
  return (
    <View style={styles.labelRow}>
      <Eyebrow>{children}</Eyebrow>
      <View style={styles.labelRule} />
      {trailing ? <Eyebrow>{trailing}</Eyebrow> : null}
    </View>
  );
}

/** App sidebar — brand, project picker, steps, and account. */
export function StepSidebar({ current }: { current: Step }) {
  const progress = `${STEPS.indexOf(current) + 1}/${STEPS.length}`;

  return (
    <View style={styles.shell}>
      <BrandButton />

      <View style={styles.projectBlock}>
        <SidebarLabel>Project</SidebarLabel>
        <ProjectPicker />
      </View>

      <View style={styles.railWrap}>
        <SidebarLabel trailing={progress}>Steps</SidebarLabel>
        <StepRail current={current} orientation="vertical" />
      </View>

      <View style={styles.footer}>
        <SidebarFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'visible',
    gap: theme.space.lg,
  },
  projectBlock: {
    gap: 8,
    zIndex: 40,
    overflow: 'visible',
  },
  railWrap: {
    flex: 1,
    minHeight: 0,
    gap: 8,
  },
  footer: {
    width: '100%',
    paddingTop: theme.space.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
  },
});
