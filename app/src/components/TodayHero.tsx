import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useMe } from '@/api/auth';
import { useFocusOverview } from '@/api/focus';
import { useTodayHabits } from '@/api/habits';
import { useTodayTasks } from '@/api/tasks';
import { fr } from '@/i18n/fr';
import { capitalize } from '@/lib/calendar';
import { todayISO } from '@/lib/dates';
import { elevation, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Same quote all day, a new one each day. */
function quoteOfTheDay(iso: string): string {
  const quotes = fr.screens.today.quotes;
  const day = Math.floor(Date.parse(iso) / 86_400_000);
  return quotes[day % quotes.length] ?? quotes[0] ?? '';
}

/**
 * Gradient card heading "Aujourd'hui": greeting, how much of the day is done, streak and habits.
 * Reads the queries the screen already makes (no extra request); each part hides until its data arrives.
 */
export function TodayHero() {
  const theme = useTheme();
  const me = useMe();
  const tasks = useTodayTasks();
  const habits = useTodayHabits();
  const focus = useFocusOverview();

  const now = new Date();
  const name = me.data ? me.data.display_name.trim() || me.data.email.split('@')[0] || '' : '';
  const done = tasks.data?.done.length ?? 0;
  const total = tasks.data ? done + tasks.data.today.length + tasks.data.overdue.length : 0;
  const allDone = total > 0 && done === total;
  const habitsDone = habits.data?.filter((h) => h.done_today).length ?? 0;
  const habitsTotal = habits.data?.length ?? 0;
  const streak = focus.data?.streak ?? 0;

  return (
    <LinearGradient
      colors={[theme.gradientStart, theme.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, elevation(theme.shadow, 2)]}>
      <View style={styles.top}>
        <AppText variant="heading" color={theme.onGradient}>
          {fr.screens.today.greeting(now.getHours(), name)}
        </AppText>
        <AppText variant="small" color={theme.onGradient} style={styles.date}>
          {capitalize(longDate.format(now))}
        </AppText>
      </View>

      {tasks.data ? (
        total === 0 ? (
          <AppText color={theme.onGradient} style={styles.headline}>
            {fr.screens.today.nothingPlanned}
          </AppText>
        ) : (
          <View
            style={styles.progress}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={fr.screens.today.dayProgressLabel(done, total)}
            accessibilityValue={{ min: 0, max: total, now: done }}>
            <AppText variant="display" color={theme.onGradient}>
              {allDone ? fr.screens.today.allDone : fr.screens.today.tasksProgress(done, total)}
            </AppText>
            <View style={[styles.track, { backgroundColor: theme.onGradientSoft }]}>
              <View style={[styles.fill, { width: `${(done / total) * 100}%`, backgroundColor: theme.onGradient }]} />
            </View>
          </View>
        )
      ) : null}

      {streak > 0 || habitsTotal > 0 ? (
        <View style={styles.pills}>
          {streak > 0 ? (
            <View style={[styles.pill, { backgroundColor: theme.accent }]}>
              <AppText variant="small" color={theme.onAccent} style={styles.pillText}>
                {fr.screens.today.streakPill(streak)}
              </AppText>
            </View>
          ) : null}
          {habitsTotal > 0 ? (
            <View style={[styles.pill, { backgroundColor: theme.onGradientShade }]}>
              <AppText variant="small" color={theme.onGradient} style={styles.pillText}>
                {fr.screens.today.habitsPill(habitsDone, habitsTotal)}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      <AppText variant="small" color={theme.onGradient} style={styles.quote}>
        {`« ${quoteOfTheDay(todayISO())} »`}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg + 4, padding: spacing.lg, gap: spacing.md },
  top: { gap: 2 },
  date: { opacity: 0.95 },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  progress: { gap: spacing.sm },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  pillText: { fontWeight: '700' },
  quote: { fontStyle: 'italic', opacity: 0.95 },
});
