import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot } from './Badge';

export interface ChipOption<T> {
  value: T;
  label: string;
  color?: string;
}

interface ChipSelectProps<T> {
  label?: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  errors?: string[];
}

/** Single choice among a few options, rendered as large tappable chips. */
export function ChipSelect<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  errors = [],
}: ChipSelectProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {label ? (
        <AppText variant="small" color={theme.text} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primary : theme.surface,
                },
                pressed && { opacity: 0.7 },
              ]}>
              {option.color ? <DomainDot color={option.color} /> : null}
              {selected ? <Ionicons name="checkmark" size={16} color={theme.onPrimary} /> : null}
              <AppText variant="small" color={selected ? theme.onPrimary : theme.text} style={styles.label}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: { fontWeight: '600' },
});
