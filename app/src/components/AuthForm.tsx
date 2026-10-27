import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { fr } from '@/i18n/fr';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Screen } from './Screen';
import { TextField } from './TextField';

export interface AuthFormValues {
  email: string;
  password: string;
  displayName: string;
}

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (values: AuthFormValues) => void;
  pending: boolean;
  error: Error | null;
}

export function AuthForm({ mode, onSubmit, pending, error }: AuthFormProps) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const apiError = error instanceof ApiError ? error : null;
  const globalMessage =
    localError ??
    (apiError?.status === 401
      ? fr.auth.invalidCredentials
      : apiError && apiError.fieldErrors('email').length + apiError.fieldErrors('password').length === 0
        ? apiError.message
        : error && !apiError
          ? fr.common.genericError
          : null);

  const submit = () => {
    if (!email.trim() || !password) {
      setLocalError(fr.auth.requiredFields);
      return;
    }
    setLocalError(null);
    onSubmit({ email: email.trim(), password, displayName: displayName.trim() });
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <AppText variant="title">{fr.appName}</AppText>
            <AppText variant="muted">{fr.tagline}</AppText>
          </View>
          <AppText variant="heading">{isRegister ? fr.auth.registerTitle : fr.auth.loginTitle}</AppText>

          <TextField
            label={fr.auth.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            errors={apiError?.fieldErrors('email')}
          />
          {isRegister ? (
            <TextField
              label={fr.auth.displayName}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
            />
          ) : null}
          <TextField
            label={fr.auth.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            onSubmitEditing={submit}
            errors={apiError?.fieldErrors('password')}
          />

          {globalMessage ? (
            <AppText color={theme.danger} accessibilityRole="alert">
              {globalMessage}
            </AppText>
          ) : null}

          <Button
            label={isRegister ? fr.auth.registerAction : fr.auth.loginAction}
            onPress={submit}
            loading={pending}
          />
          <Button
            label={isRegister ? fr.auth.toLogin : fr.auth.toRegister}
            variant="ghost"
            onPress={() => router.replace(isRegister ? '/login' : '/register')}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
});
