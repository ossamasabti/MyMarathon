import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { fr } from '@/i18n/fr';
import { parseFrenchDate, toFrenchInput } from '@/lib/dates';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { TextField } from './TextField';

export interface DateShortcut {
  label: string;
  value: ISODate;
}

interface DateFieldProps {
  label: string;
  value: ISODate | null;
  onChange: (value: ISODate | null) => void;
  shortcuts?: DateShortcut[];
  /** Show an "Effacer" shortcut (optional dates). */
  clearable?: boolean;
  errors?: string[];
}

/**
 * Text date input (JJ/MM/AAAA) with shortcuts. Works the same on web and mobile;
 * the native pickers are not available on the web.
 */
export function DateField({ label, value, onChange, shortcuts = [], clearable = false, errors = [] }: DateFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(toFrenchInput(value));
  const [invalid, setInvalid] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Keep the text in sync when the value is changed from outside (shortcuts, form reset).
  if (value !== lastValue) {
    setLastValue(value);
    setText(toFrenchInput(value));
    setInvalid(false);
  }

  const commit = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setInvalid(false);
      if (clearable) onChange(null);
      return;
    }
    const parsed = parseFrenchDate(next);
    setInvalid(parsed === null);
    if (parsed) {
      setLastValue(parsed);
      onChange(parsed);
    }
  };

  const chips: { label: string; value: ISODate | null }[] = [...shortcuts];
  if (clearable) chips.push({ label: fr.dates.clear, value: null });

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={text}
        onChangeText={commit}
        placeholder={fr.dates.placeholder}
        inputMode="numeric"
        maxLength={10}
        errors={invalid ? [fr.dates.invalid, ...errors] : errors}
      />
      {chips.length ? (
        <View style={styles.row}>
          {chips.map((chip) => (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              accessibilityLabel={`${label} : ${chip.label}`}
              onPress={() => onChange(chip.value)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                pressed && { opacity: 0.7 },
              ]}>
              <AppText variant="small" color={theme.primary}>
                {chip.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
