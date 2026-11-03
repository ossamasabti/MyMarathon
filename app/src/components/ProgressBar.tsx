import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface ProgressBarProps {
  /** Between 0 and 1. */
  value: number;
  late?: boolean;
  achieved?: boolean;
  color?: string;
  /** Hide the "x % du parcours" caption (compact rows). */
  compact?: boolean;
}

/** Progress shown as distance covered on a course; a reached goal crosses the finish line. */
export function ProgressBar({ value, late = false, achieved = false, color, compact = false }: ProgressBarProps) {
  const theme = useTheme();
  const display = useDomainColor();
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const fill = achieved ? theme.success : late ? theme.danger : color ? display(color) : null;
  const caption = achieved ? `\u{1F3C1} ${fr.progress.finished}` : fr.progress.distance(percent);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={late ? `${caption}, ${fr.progress.late}` : caption}
      accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        {fill ? (
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: fill }]} />
        ) : (
          // No domain color: the brand gradient.
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${percent}%` }]}
          />
        )}
      </View>
      {compact ? null : (
        <View style={styles.captionRow}>
          <AppText variant="small">{caption}</AppText>
          {late && !achieved ? (
            <AppText variant="small" color={theme.danger}>
              {fr.progress.late}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
