import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePeriodReview, useReviewSummary, useSaveReview } from '@/api/reviews';
import type { Review, ReviewSummary, ReviewType, SummaryGoal } from '@/api/types';
import { AppText } from '@/components/AppText';
import { DomainDot, HorizonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { periodBounds, periodLabel } from '@/lib/calendar';
import { formatRange } from '@/lib/dates';
import { reviewQuestions } from '@/lib/reviewQuestions';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const TYPES: readonly ReviewType[] = ['weekly', 'monthly', 'quarterly'];
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function GuidedReviewScreen() {
  const params = useLocalSearchParams<{ type: string; start: string }>();
  const type = (TYPES as readonly string[]).includes(params.type) ? (params.type as ReviewType) : 'weekly';
  // Normalize any date of the period to its first day.
  const start = periodBounds(type, ISO_PATTERN.test(params.start) ? params.start : undefined)[0];
  const end = periodBounds(type, start)[1];
  const review = usePeriodReview(type, start);
  const summary = useReviewSummary(type, start);

  return (
    <Screen>
      <Header title={`${fr.reviewType[type]} · ${periodLabel(type, start)}`} />
      <AppText variant="muted">{formatRange(start, end)}</AppText>

      <Section title={fr.review.summary}>
        {summary.isPending ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />
        ) : (
          <SummaryView summary={summary.data} />
        )}
      </Section>

      {review.isPending ? (
        <LoadingState />
      ) : review.isError ? (
        <ErrorState message={review.error.message} onRetry={() => review.refetch()} />
      ) : (
        // Keyed so that answers reset when the period changes.
        <Questions key={`${type}-${start}`} type={type} start={start} review={review.data} />
      )}
    </Screen>
  );
}

function SummaryView({ summary }: { summary: ReviewSummary }) {
  return (
    <View style={styles.summary}>
      <View style={styles.block}>
        <AppText variant="heading">{fr.review.tasksDone(summary.tasks_done.count)}</AppText>
        {summary.tasks_done.count === 0 ? (
          <AppText variant="muted">{fr.review.noTasksDone}</AppText>
        ) : (
          summary.tasks_done.items.slice(0, 8).map((t) => (
            <AppText key={t.id} variant="small">
              {`✓ ${t.title}`}
            </AppText>
          ))
        )}
        {summary.tasks_done.count > 8 ? <AppText variant="small">…</AppText> : null}
      </View>

      <View style={styles.block}>
        <AppText variant="heading">{fr.review.advanced}</AppText>
        {summary.goals_advanced.length === 0 ? (
          <EmptyState message={fr.review.advancedEmpty} />
        ) : (
          summary.goals_advanced.map((goal) => (
            <GoalSummaryRow key={goal.id} goal={goal} extra={fr.review.tasksForGoal(goal.tasks_done)} />
          ))
        )}
      </View>

      {summary.goals_achieved.length ? (
        <View style={styles.block}>
          <AppText variant="heading">{`\u{1F3C1} ${fr.review.achieved}`}</AppText>
          {summary.goals_achieved.map((goal) => (
            <GoalSummaryRow key={goal.id} goal={goal} />
          ))}
        </View>
      ) : null}

      {summary.habits.length ? (
        <View style={styles.block}>
          <AppText variant="heading">{fr.review.habits}</AppText>
          {summary.habits.map((habit) => (
            <View key={habit.id} style={styles.habit}>
              <AppText style={styles.flex}>{habit.title}</AppText>
              <View style={styles.habitBar}>
                <ProgressBar value={habit.rate} compact />
              </View>
              <AppText variant="small">{fr.review.habitRate(Math.round(habit.rate * 100))}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      {summary.goals_late.length ? (
        <View style={styles.block}>
          <AppText variant="heading">{fr.review.late}</AppText>
          {summary.goals_late.map((goal) => (
            <GoalSummaryRow key={goal.id} goal={goal} late />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GoalSummaryRow({ goal, extra, late = false }: { goal: SummaryGoal; extra?: string; late?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(goal.id) } })}
      style={({ pressed }) => [styles.goal, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}>
      <View style={styles.goalTitle}>
        {goal.domain_color ? <DomainDot color={goal.domain_color} /> : null}
        <AppText style={styles.flex} numberOfLines={2}>
          {goal.title}
        </AppText>
        <HorizonBadge horizon={goal.horizon} />
      </View>
      {extra ? <AppText variant="small">{extra}</AppText> : null}
      <ProgressBar
        value={goal.progress}
        late={late}
        achieved={goal.status === 'achieved'}
        color={goal.domain_color ?? undefined}
      />
    </Pressable>
  );
}

function Questions({ type, start, review }: { type: ReviewType; start: string; review: Review | null }) {
  const theme = useTheme();
  const save = useSaveReview(review?.id);
  const [answers, setAnswers] = useState<Record<string, string>>(review?.answers ?? {});
  const [saved, setSaved] = useState(false);

  const submit = () =>
    save.mutate({ type, period_start: start, answers }, { onSuccess: () => setSaved(true) });

  return (
    <Section title={fr.review.questions}>
      {reviewQuestions(type).map((question) => (
        <TextField
          key={question.key}
          label={question.label}
          placeholder={question.placeholder}
          value={answers[question.key] ?? ''}
          onChangeText={(text) => {
            setSaved(false);
            setAnswers((prev) => ({ ...prev, [question.key]: text }));
          }}
          multiline
          numberOfLines={4}
        />
      ))}
      {save.isError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {save.error.message}
        </AppText>
      ) : null}
      {saved ? (
        <AppText color={theme.success} accessibilityRole="alert">
          {`✓ ${fr.review.saved}`}
        </AppText>
      ) : null}
      <Button label={fr.review.save} onPress={submit} loading={save.isPending} />
    </Section>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.lg },
  block: { gap: spacing.xs },
  goal: { paddingVertical: spacing.sm, gap: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: MIN_TOUCH },
  goalTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH },
  habitBar: { width: 120 },
  flex: { flex: 1 },
});
