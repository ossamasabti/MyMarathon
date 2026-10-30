import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Section } from '@/components/Section';
import { fr } from '@/i18n/fr';
import { formatClock, formatDuration } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { restEndsAt, useFocusStore, type FocusRest } from '@/stores/focusStore';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { SessionReview } from './SessionReview';

/** Break between two cycles: countdown, a tip to really rest, and the review of the cycle just done. */
export function RestScreen({ rest }: { rest: FocusRest }) {
  const theme = useTheme();
  const over = rest.endedAt !== null;
  const now = useNow(!over);
  const clock = formatClock(over ? 0 : restEndsAt(rest) - now);
  const tips = fr.focus.breakTips;
  // A different tip at each break.
  const tip = tips[rest.nextIndex % tips.length];
  const { recap } = rest;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.title;
    document.title = `${over ? fr.focus.restDone : fr.focus.bannerRest(clock)} · ${fr.focus.title}`;
    return () => {
      document.title = previous;
    };
  }, [clock, over]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="cafe-outline" size={36} color={theme.primary} />
        <AppText variant="muted">{fr.focus.restIntro(rest.nextIndex - 1)}</AppText>
        <AppText variant="heading">{over ? fr.focus.restDone : fr.focus.restTitle[rest.kind]}</AppText>
        <AppText
          style={[styles.clock, { color: over ? theme.textMuted : theme.text }]}
          accessibilityRole="timer"
          accessibilityLabel={fr.focus.restRemaining(clock)}>
          {clock}
        </AppText>
        {tip ? (
          <AppText style={styles.center} color={theme.text}>
            {tip}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={fr.focus.nextCycle(rest.nextIndex)}
            variant={over ? 'primary' : 'secondary'}
            onPress={() => useFocusStore.getState().nextCycle()}
          />
          <Button label={fr.focus.stopCycles} variant="ghost" onPress={() => useFocusStore.getState().clearRest()} />
        </View>
      </View>

      <Section title={fr.focus.reviewTitle}>
        <AppText>
          {recap.taskTitle
            ? fr.focus.addedToTask(formatDuration(recap.seconds), recap.taskTitle)
            : fr.focus.summary(formatDuration(recap.seconds))}
        </AppText>
        <SessionReview
          serverId={recap.serverId}
          intention={recap.intention}
          distractions={recap.distractions}
          capturedNotes={recap.capturedNotes}
          initialQuality={recap.quality}
          onRated={(quality) => useFocusStore.getState().rateRecap(quality)}
        />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  clock: { fontSize: 64, lineHeight: 76, fontWeight: '700', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center', maxWidth: 480 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
});
