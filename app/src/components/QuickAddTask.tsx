import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useSaveTask } from '@/api/tasks';
import type { ISODate } from '@/api/types';
import { fr } from '@/i18n/fr';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { GoalPicker } from './GoalPicker';

interface QuickAddTaskProps {
  /** Fixed goal (detail screen); otherwise the user can pick one. */
  goalId?: number;
  plannedDate?: ISODate | null;
  placeholder?: string;
}

export function QuickAddTask({ goalId, plannedDate = null, placeholder = fr.task.addPlaceholder }: QuickAddTaskProps) {
  const theme = useTheme();
  const save = useSaveTask();
  const [title, setTitle] = useState('');
  const [pickedGoal, setPickedGoal] = useState<number | null>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || save.isPending) return;
    save.mutate(
      { title: trimmed, goal: goalId ?? pickedGoal, planned_date: plannedDate },
      { onSuccess: () => setTitle('') },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          // Keep focus after Enter to add several tasks in a row
          // (submitBehavior for native, blurOnSubmit for react-native-web).
          submitBehavior="submit"
          blurOnSubmit={false}
          returnKeyType="done"
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        />
        <Button label={fr.common.add} onPress={submit} loading={save.isPending} disabled={!title.trim()} />
      </View>
      {goalId === undefined ? (
        <GoalPicker label={fr.task.linkGoal} value={pickedGoal} onChange={setPickedGoal} noneLabel={fr.task.noGoal} />
      ) : null}
      {save.isError ? (
        <AppText variant="small" color={theme.danger} accessibilityRole="alert">
          {save.error.message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
