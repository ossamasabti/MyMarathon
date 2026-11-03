import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useGoals } from '@/api/goals';
import type { Goal, Horizon } from '@/api/types';
import { fr } from '@/i18n/fr';
import { HORIZONS } from '@/lib/horizons';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { HorizonBadge } from './Badge';
import { Dialog } from './Dialog';
import { ErrorState, LoadingState } from './States';
import { TextField } from './TextField';

interface GoalPickerProps {
  label: string;
  value: number | null;
  onChange: (goalId: number | null) => void;
  /** Label of the "no goal" choice. */
  noneLabel: string;
  /** Restrict the choice (e.g. parents must have a longer horizon). */
  allowedHorizons?: readonly Horizon[];
  /** Goal ids that cannot be picked (e.g. the goal being edited). */
  excludeIds?: number[];
  errors?: string[];
}

/** A field that opens a searchable list of the user's goals. */
export function GoalPicker({
  label,
  value,
  onChange,
  noneLabel,
  allowedHorizons = HORIZONS,
  excludeIds = [],
  errors = [],
}: GoalPickerProps) {
  const theme = useTheme();
  const goals = useGoals();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = goals.data?.find((g) => g.id === value);
  const choices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (goals.data ?? [])
      .filter((g) => allowedHorizons.includes(g.horizon) && !excludeIds.includes(g.id))
      .filter((g) => g.status !== 'abandoned')
      .filter((g) => !needle || g.title.toLowerCase().includes(needle))
      .sort((a, b) => HORIZONS.indexOf(a.horizon) - HORIZONS.indexOf(b.horizon));
  }, [goals.data, search, allowedHorizons, excludeIds]);

  const pick = (goalId: number | null) => {
    onChange(goalId);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      <AppText variant="small" color={theme.text} style={styles.label}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${selected?.title ?? noneLabel}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { borderColor: errors.length ? theme.danger : theme.surfaceAlt, backgroundColor: theme.surfaceAlt },
          pressed && { opacity: 0.7 },
        ]}>
        <AppText color={selected ? theme.text : theme.textMuted} numberOfLines={1} style={styles.flex}>
          {selected?.title ?? noneLabel}
        </AppText>
        {selected ? <HorizonBadge horizon={selected.horizon} /> : null}
      </Pressable>
      {errors.map((message) => (
        <AppText key={message} variant="small" color={theme.danger}>
          {message}
        </AppText>
      ))}

      <Dialog visible={open} title={fr.goal.pick} onClose={() => setOpen(false)}>
        <TextField label={fr.common.search} value={search} onChangeText={setSearch} autoFocus />
        <ScrollView style={styles.list}>
          <Option label={noneLabel} selected={value === null} onPress={() => pick(null)} />
          {goals.isPending ? (
            <LoadingState />
          ) : goals.isError ? (
            <ErrorState message={goals.error.message} onRetry={() => goals.refetch()} />
          ) : (
            choices.map((goal) => (
              <Option key={goal.id} goal={goal} selected={goal.id === value} onPress={() => pick(goal.id)} />
            ))
          )}
        </ScrollView>
      </Dialog>
    </View>
  );
}

function Option({
  goal,
  label,
  selected,
  onPress,
}: {
  goal?: Goal;
  label?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderBottomColor: theme.border },
        selected && { backgroundColor: theme.primarySoft },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={styles.flex}>
        <AppText numberOfLines={2}>{goal?.title ?? label}</AppText>
        {goal?.ancestors.length ? (
          <AppText variant="small" numberOfLines={1}>
            {goal.ancestors.map((a) => a.title).join(' › ')}
          </AppText>
        ) : null}
      </View>
      {goal ? <HorizonBadge horizon={goal.horizon} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontWeight: '600' },
  field: {
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  list: { maxHeight: 360 },
  option: {
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
