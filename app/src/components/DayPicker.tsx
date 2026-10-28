import { Pressable, StyleSheet, View } from 'react-native';

import { WEEKDAY_LETTERS, WEEKDAY_SHORT } from '@/lib/calendar';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface DayPickerProps {
  label: string;
  /** Selected weekdays, Monday = 0. */
  value: number[];
  onChange: (days: number[]) => void;
  hint?: string;
  errors?: string[];
}

/** Multiple choice among the 7 weekdays (L M M J V S D). */
export function DayPicker({ label, value, onChange, hint, errors = [] }: DayPickerProps) {
  const theme = useTheme();
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));

  return (
    <View style={styles.container}>
      <AppText variant="small" color={theme.text}>
        {label}
      </AppText>
      <View style={styles.row}>
        {WEEKDAY_LETTERS.map((letter, day) => {
          const selected = value.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityLabel={WEEKDAY_SHORT[day]}
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(day)}
              style={({ pressed }) => [
                styles.day,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primary : theme.surface,
                },
                pressed && { opacity: 0.7 },
              ]}>
              <AppText color={selected ? theme.onPrimary : theme.text} style={styles.letter}>
                {letter}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {hint ? <AppText variant="small">{hint}</AppText> : null}
      {errors.map((message) => (
        <AppText key={message} variant="small" color={theme.danger}>
          {message}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  day: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontWeight: '600' },
});
