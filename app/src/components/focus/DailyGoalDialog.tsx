import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useUpdateMe } from '@/api/auth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { formatDuration } from '@/lib/time';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const GOAL_PRESETS = [30, 60, 120, 180, 240] as const;
const MIN_GOAL = 10;
const MAX_GOAL = 720;

interface DailyGoalDialogProps {
  visible: boolean;
  goalMinutes: number;
  onClose: () => void;
}

/** Daily focus goal (stored on the account, shared by all devices). */
export function DailyGoalDialog({ visible, goalMinutes, onClose }: DailyGoalDialogProps) {
  return (
    <Dialog visible={visible} title={fr.focus.goalTitle} onClose={onClose}>
      {/* Remount on open so the field starts from the current goal. */}
      {visible ? <GoalForm goalMinutes={goalMinutes} onDone={onClose} /> : null}
    </Dialog>
  );
}

function GoalForm({ goalMinutes, onDone }: { goalMinutes: number; onDone: () => void }) {
  const theme = useTheme();
  const update = useUpdateMe();
  const [minutes, setMinutes] = useState(String(goalMinutes));
  const parsed = Number.parseInt(minutes, 10);
  const valid = Number.isInteger(parsed) && parsed >= MIN_GOAL && parsed <= MAX_GOAL;

  return (
    <View style={styles.form}>
      <AppText variant="small">{fr.focus.goalHint}</AppText>
      <ChipSelect
        options={GOAL_PRESETS.map((m) => ({ value: String(m), label: formatDuration(m * 60) }))}
        value={minutes}
        onChange={setMinutes}
      />
      <TextField
        label={fr.focus.goalCustom}
        value={minutes}
        onChangeText={setMinutes}
        inputMode="numeric"
        maxLength={3}
        errors={valid ? [] : [fr.focus.goalInvalid]}
      />
      {update.isError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {update.error.message}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={fr.common.cancel} variant="secondary" onPress={onDone} />
        <Button
          label={fr.common.save}
          loading={update.isPending}
          disabled={!valid}
          onPress={() => update.mutate({ focus_goal_minutes: parsed }, { onSuccess: onDone })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
});
