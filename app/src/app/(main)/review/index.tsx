import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePeriodReview, useReviews } from '@/api/reviews';
import type { Review, ReviewType } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { periodBounds, periodLabel, shiftPeriod } from '@/lib/calendar';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const TYPES: ReviewType[] = ['weekly', 'monthly', 'quarterly'];

function openReview(type: ReviewType, start: string) {
  router.push({ pathname: '/review/[type]/[start]', params: { type, start } });
}

export default function ReviewHubScreen() {
  const [type, setType] = useState<ReviewType>('weekly');
  const [start, setStart] = useState(() => periodBounds('weekly')[0]);
  const current = periodBounds(type)[0];
  const existing = usePeriodReview(type, start);
  const history = useReviews();

  const changeType = (next: ReviewType) => {
    setType(next);
    setStart(periodBounds(next)[0]);
  };

  return (
    <Screen title={fr.review.title}>
      <Section>
        <ChipSelect
          label={fr.review.type}
          options={TYPES.map((t) => ({ value: t, label: fr.reviewType[t] }))}
          value={type}
          onChange={changeType}
        />
        <View style={styles.period}>
          <IconButton icon="chevron-back" label={fr.review.previous} onPress={() => setStart(shiftPeriod(type, start, -1))} />
          <AppText variant="heading" accessibilityLiveRegion="polite" style={styles.periodLabel}>
            {periodLabel(type, start)}
          </AppText>
          <IconButton
            icon="chevron-forward"
            label={fr.review.next}
            disabled={start >= current}
            onPress={() => setStart(shiftPeriod(type, start, 1))}
          />
          {start !== current ? (
            <Button label={fr.review.current} variant="ghost" onPress={() => setStart(current)} />
          ) : null}
        </View>
        {existing.isPending ? (
          <LoadingState />
        ) : existing.isError ? (
          <ErrorState message={existing.error.message} onRetry={() => existing.refetch()} />
        ) : (
          <View style={styles.actions}>
            {existing.data ? <Badge label={`✓ ${fr.review.done}`} /> : null}
            <Button
              label={existing.data ? fr.review.resume : fr.review.start}
              onPress={() => openReview(type, start)}
            />
          </View>
        )}
      </Section>

      <Section title={fr.review.history}>
        {history.isPending ? (
          <LoadingState />
        ) : history.isError ? (
          <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
        ) : history.data.length === 0 ? (
          <EmptyState message={fr.review.historyEmpty} />
        ) : (
          history.data.map((review) => <HistoryRow key={review.id} review={review} />)
        )}
      </Section>
    </Screen>
  );
}

function HistoryRow({ review }: { review: Review }) {
  const theme = useTheme();
  const answered = Object.values(review.answers).filter((a) => a.trim()).length;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => openReview(review.type, review.period_start)}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}>
      <View style={styles.flex}>
        <AppText>{periodLabel(review.type, review.period_start)}</AppText>
        <AppText variant="small">{fr.reviewType[review.type]}</AppText>
      </View>
      <AppText variant="small">{answered} ✎</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  period: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  periodLabel: { minWidth: 170, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  row: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});
