import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errors?: string[];
}

export function TextField({ label, errors = [], ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const hasError = errors.length > 0;
  return (
    <View style={styles.container}>
      <AppText variant="small" color={theme.text}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: hasError ? theme.danger : theme.border,
          },
        ]}
        {...inputProps}
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
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});
