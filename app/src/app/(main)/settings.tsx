import { StyleSheet, View } from 'react-native';

import { useLogout, useMe } from '@/api/auth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export default function SettingsScreen() {
  const theme = useTheme();
  const me = useMe();
  const logout = useLogout();
  const cardStyle = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <Screen title={fr.nav.settings}>
      <View style={cardStyle}>
        <AppText variant="heading">{fr.screens.settings.profile}</AppText>
        {me.isPending ? (
          <LoadingState />
        ) : me.isError ? (
          <ErrorState message={me.error.message} onRetry={() => me.refetch()} />
        ) : (
          <View style={styles.profile}>
            {me.data.display_name ? <AppText>{me.data.display_name}</AppText> : null}
            <AppText variant="muted">{me.data.email}</AppText>
          </View>
        )}
      </View>

      <View style={cardStyle}>
        <AppText variant="heading">{fr.screens.settings.theme}</AppText>
        <AppText variant="muted">{fr.screens.settings.themeSystem}</AppText>
      </View>

      <Button
        label={fr.screens.settings.logout}
        variant="secondary"
        loading={logout.isPending}
        onPress={() => logout.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  profile: { gap: spacing.xs },
});
