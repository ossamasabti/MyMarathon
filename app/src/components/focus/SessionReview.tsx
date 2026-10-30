import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSaveTask } from '@/api/tasks';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { fr } from '@/i18n/fr';
import { rateFocusSession } from '@/lib/focusSync';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const QUALITY_VALUES = [1, 2, 3, 4, 5] as const;

interface SessionReviewProps {
  /** Server row of the session; null when nothing was counted (under a minute). */
  serverId: number | null;
  intention: string;
  distractions: number;
  capturedNotes: string[];
  /** Quality already given (restored after a reload). */
  initialQuality?: number | null;
  onRated?: (quality: number) => void;
}

/** End-of-session review: intention recalled, quality 1-5, distractions, thoughts turned into tasks. */
export function SessionReview({
  serverId,
  intention,
  distractions,
  capturedNotes,
  initialQuality = null,
  onRated,
}: SessionReviewProps) {
  return (
    <View style={styles.container}>
      {intention ? <AppText>{fr.focus.intentionRecall(intention)}</AppText> : null}
      {serverId !== null ? <QualityPicker serverId={serverId} initial={initialQuality} onRated={onRated} /> : null}
      <AppText variant="small">{fr.focus.distractionsSummary(distractions)}</AppText>
      {capturedNotes.length > 0 ? <CapturedNotes notes={capturedNotes} /> : null}
    </View>
  );
}

interface QualityPickerProps {
  serverId: number;
  initial: number | null;
  onRated?: (quality: number) => void;
}

function QualityPicker({ serverId, initial, onRated }: QualityPickerProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [quality, setQuality] = useState<number | null>(initial);
  const [failed, setFailed] = useState(false);

  const rate = (value: number) => {
    setQuality(value);
    setFailed(false);
    rateFocusSession(queryClient, serverId, value)
      .then(() => onRated?.(value))
      .catch(() => setFailed(true));
  };

  return (
    <View style={styles.group}>
      <AppText color={theme.text}>{fr.focus.qualityLabel}</AppText>
      <View style={styles.qualityRow} accessibilityRole="radiogroup">
        {QUALITY_VALUES.map((value) => {
          const selected = value === quality;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={fr.focus.qualityOption(value)}
              onPress={() => rate(value)}
              style={({ pressed }) => [
                styles.qualityButton,
                {
                  backgroundColor: selected ? theme.primary : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <AppText style={styles.qualityText} color={selected ? theme.onPrimary : theme.text}>
                {value}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="small">{fr.focus.qualityHint}</AppText>
      {failed ? (
        <AppText variant="small" color={theme.danger} accessibilityRole="alert">
          {fr.focus.qualityError}
        </AppText>
      ) : null}
    </View>
  );
}

function CapturedNotes({ notes }: { notes: string[] }) {
  const theme = useTheme();
  const save = useSaveTask();
  const [created, setCreated] = useState<number[]>([]);
  const [pending, setPending] = useState<number | null>(null);

  const toTask = (index: number, note: string) => {
    setPending(index);
    save.mutate(
      { title: note },
      {
        onSuccess: () => setCreated((list) => [...list, index]),
        onSettled: () => setPending(null),
      },
    );
  };

  return (
    <View style={styles.group}>
      <AppText color={theme.text}>{fr.focus.capturedTitle}</AppText>
      {notes.map((note, index) => (
        <View key={`${index}-${note}`} style={[styles.note, { borderColor: theme.border }]}>
          <AppText style={styles.noteText}>{note}</AppText>
          {created.includes(index) ? (
            <AppText variant="small" color={theme.success}>
              {`✓ ${fr.focus.taskCreated}`}
            </AppText>
          ) : (
            <Button
              label={fr.focus.toTask}
              variant="ghost"
              loading={pending === index}
              disabled={pending !== null && pending !== index}
              onPress={() => toTask(index, note)}
            />
          )}
        </View>
      ))}
      {save.isError ? (
        <AppText variant="small" color={theme.danger} accessibilityRole="alert">
          {save.error.message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, width: '100%' },
  group: { gap: spacing.sm },
  qualityRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  qualityButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityText: { fontWeight: '600' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  noteText: { flex: 1, minWidth: 160 },
});
