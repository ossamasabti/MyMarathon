import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { fontFor } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errors?: string[];
}

export function TextField({ label, errors = [], ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const hasError = errors.length > 0;
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <AppText variant="small" color={theme.text} style={styles.label}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        textAlignVertical={inputProps.multiline ? 'top' : undefined}
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          {
            color: theme.text,
            backgroundColor: theme.surfaceAlt,
            borderColor: hasError ? theme.danger : focused ? theme.primary : theme.surfaceAlt,
          },
          fontFor(),
        ]}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
      />
      {errors.map((message) => (
        <AppText key={message} variant="small" color={theme.danger} accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontWeight: '600' },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  multiline: { minHeight: 96, paddingVertical: spacing.sm },
});
