import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDomains } from '@/api/domains';
import { useGoals } from '@/api/goals';
import type { Goal, GoalInput, GoalStatus, Horizon } from '@/api/types';
import { fr } from '@/i18n/fr';
import { defaultRange, endOfMonth, endOfQuarter, endOfYear, todayISO } from '@/lib/dates';
import { childHorizons, HORIZONS } from '@/lib/horizons';
import { formatDecimal } from '@/lib/numbers';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { ChipSelect } from './ChipSelect';
import { DateField, type DateShortcut } from './DateField';
import { GoalPicker } from './GoalPicker';
import { Section } from './Section';
import { TextField } from './TextField';

interface GoalFormProps {
  initial?: Goal;
  /** Prefill for "+ Sous-objectif". */
  defaultParent?: number | null;
  defaultDomain?: number | null;
  onSubmit: (input: GoalInput) => void;
  pending: boolean;
  error: Error | null;
}

const STATUSES: GoalStatus[] = ['active', 'paused', 'achieved', 'abandoned'];

export function GoalForm({ initial, defaultParent = null, defaultDomain = null, onSubmit, pending, error }: GoalFormProps) {
  const theme = useTheme();
  const domains = useDomains();
  const goals = useGoals();

  const [parentId, setParentId] = useState<number | null>(initial?.parent ?? defaultParent);
  const parent = goals.data?.find((g) => g.id === parentId);
  const allowed = childHorizons(parent?.horizon);

  // The screens render this form once goals are loaded, so `parent` is known here.
  const firstHorizon: Horizon = initial?.horizon ?? allowed[0] ?? 'monthly';
  const [range] = useState(() => {
    const [start, end] = defaultRange(firstHorizon);
    if (!parent) return [start, end] as const;
    // Keep the default period inside the parent's.
    const clampedStart = start < parent.start_date || start > parent.end_date ? parent.start_date : start;
    const clampedEnd = end > parent.end_date || end < clampedStart ? parent.end_date : end;
    return [clampedStart, clampedEnd] as const;
  });
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [horizon, setHorizon] = useState<Horizon>(firstHorizon);
  const [domain, setDomain] = useState<number | null>(initial?.domain ?? defaultDomain ?? parent?.domain ?? null);
  const [startDate, setStartDate] = useState<string | null>(initial?.start_date ?? range[0]);
  const [endDate, setEndDate] = useState<string | null>(initial?.end_date ?? range[1]);
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? 'active');
  const [target, setTarget] = useState(formatDecimal(initial?.target_value ?? null));
  const [current, setCurrent] = useState(formatDecimal(initial?.current_value ?? null));
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const apiError = error instanceof ApiError ? error : null;
  const errorsFor = (field: string) => [
    ...(localErrors[field] ? [localErrors[field]] : []),
    ...(apiError?.fieldErrors(field) ?? []),
  ];
  const knownFields = ['title', 'horizon', 'start_date', 'end_date', 'parent', 'domain', 'target_value', 'current_value'];
  const otherError =
    error && (!apiError || !knownFields.some((f) => apiError.fieldErrors(f).length)) ? error.message : null;

  const changeParent = (id: number | null) => {
    setParentId(id);
    const nextParent = goals.data?.find((g) => g.id === id);
    const nextAllowed = childHorizons(nextParent?.horizon);
    if (!nextAllowed.includes(horizon) && nextAllowed[0]) setHorizon(nextAllowed[0]);
    if (nextParent && domain === null) setDomain(nextParent.domain);
  };

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = fr.common.required;
    if (!startDate) errors.start_date = fr.common.required;
    if (!endDate) errors.end_date = fr.common.required;
    setLocalErrors(errors);
    if (Object.keys(errors).length || !startDate || !endDate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      horizon,
      parent: parentId,
      domain,
      start_date: startDate,
      end_date: endDate,
      status,
      target_value: target.trim() ? target.trim().replace(',', '.') : null,
      current_value: current.trim() ? current.trim().replace(',', '.') : null,
      unit: unit.trim(),
    });
  };

  const today = todayISO();
  const startShortcuts: DateShortcut[] = [{ label: fr.dates.today, value: today }];
  const endShortcuts: DateShortcut[] = [
    { label: fr.dates.endOfMonth, value: endOfMonth() },
    { label: fr.dates.endOfQuarter, value: endOfQuarter() },
    { label: fr.dates.endOfYear, value: endOfYear() },
  ];
  if (parent) endShortcuts.push({ label: fr.goal.parent, value: parent.end_date });

  return (
    <View style={styles.form}>
      <TextField label={fr.goal.title} value={title} onChangeText={setTitle} errors={errorsFor('title')} />
      <GoalPicker
        label={fr.goal.parent}
        value={parentId}
        onChange={changeParent}
        noneLabel={fr.goal.noParent}
        allowedHorizons={HORIZONS.slice(0, 3)}
        excludeIds={initial ? [initial.id] : []}
        errors={errorsFor('parent')}
      />
      <ChipSelect
        label={fr.goal.horizon}
        options={allowed.map((h) => ({ value: h, label: fr.horizon[h] }))}
        value={horizon}
        onChange={setHorizon}
        errors={errorsFor('horizon')}
      />
      <ChipSelect<number | null>
        label={fr.goal.domain}
        options={[
          { value: null, label: fr.domain.none },
          ...(domains.data ?? []).map((d) => ({ value: d.id, label: d.name, color: d.color })),
        ]}
        value={domain}
        onChange={setDomain}
        errors={errorsFor('domain')}
      />
      <DateField
        label={fr.goal.startDate}
        value={startDate}
        onChange={setStartDate}
        shortcuts={parent ? [...startShortcuts, { label: fr.goal.parent, value: parent.start_date }] : startShortcuts}
        errors={errorsFor('start_date')}
      />
      <DateField
        label={fr.goal.endDate}
        value={endDate}
        onChange={setEndDate}
        shortcuts={endShortcuts}
        errors={errorsFor('end_date')}
      />
      <TextField
        label={fr.goal.description}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Section title={fr.goal.indicator}>
        <AppText variant="small">{fr.goal.indicatorHint}</AppText>
        <View style={styles.indicatorRow}>
          <View style={styles.flex}>
            <TextField
              label={fr.goal.currentValue}
              value={current}
              onChangeText={setCurrent}
              inputMode="decimal"
              errors={errorsFor('current_value')}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label={fr.goal.targetValue}
              value={target}
              onChangeText={setTarget}
              inputMode="decimal"
              errors={errorsFor('target_value')}
            />
          </View>
        </View>
        <TextField label={fr.goal.unit} value={unit} onChangeText={setUnit} />
      </Section>

      {initial ? (
        <ChipSelect
          label={fr.goal.status}
          options={STATUSES.map((s) => ({ value: s, label: fr.goalStatus[s] }))}
          value={status}
          onChange={setStatus}
        />
      ) : null}

      {otherError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {otherError}
        </AppText>
      ) : null}
      <Button label={fr.common.save} onPress={submit} loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  indicatorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 140 },
});
