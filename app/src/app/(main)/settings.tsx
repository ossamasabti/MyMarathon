import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useLogout, useMe, useUpdateMe } from '@/api/auth';
import type { User } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { DailyGoalDialog } from '@/components/focus/DailyGoalDialog';
import { ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { notificationsSupported, requestPermission } from '@/lib/notifications';
import { LEAD_MINUTES_CHOICES } from '@/lib/reminders';
import { formatDuration } from '@/lib/time';
import { usePrefsStore, type ThemePreference } from '@/stores/prefsStore';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const me = useMe();
  const logout = useLogout();

  return (
    <Screen title={fr.nav.settings}>
      <Section title={fr.screens.settings.profile}>
        {me.isPending ? (
          <LoadingState />
        ) : me.isError ? (
          <ErrorState message={me.error.message} onRetry={() => me.refetch()} />
        ) : (
          <ProfileForm key={me.data.id} user={me.data} />
        )}
      </Section>

      <ThemeSection />
      {me.data ? <FocusSection goalMinutes={me.data.focus_goal_minutes} /> : null}
      <NotificationsSection />

      <Button
        label={fr.screens.settings.logout}
        variant="secondary"
        loading={logout.isPending}
        onPress={() => logout.mutate()}
      />
    </Screen>
  );
}

function ProfileForm({ user }: { user: User }) {
  const theme = useTheme();
  const update = useUpdateMe();
  const [name, setName] = useState(user.display_name);
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.group}>
      <AppText variant="muted">{user.email}</AppText>
      <TextField
        label={fr.screens.settings.displayName}
        value={name}
        onChangeText={(text) => {
          setSaved(false);
          setName(text);
        }}
        autoComplete="name"
      />
      {update.isError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {update.error.message}
        </AppText>
      ) : null}
      {saved ? (
        <AppText color={theme.success} accessibilityRole="alert">
          {`✓ ${fr.screens.settings.profileSaved}`}
        </AppText>
      ) : null}
      <Button
        label={fr.common.save}
        variant="secondary"
        loading={update.isPending}
        disabled={name.trim() === user.display_name}
        onPress={() => update.mutate({ display_name: name.trim() }, { onSuccess: () => setSaved(true) })}
      />
    </View>
  );
}

function ThemeSection() {
  const preference = usePrefsStore((s) => s.theme);
  const setTheme = usePrefsStore((s) => s.setTheme);
  return (
    <Section title={fr.screens.settings.theme}>
      <ChipSelect
        options={THEMES.map((t) => ({ value: t, label: fr.screens.settings.themes[t] }))}
        value={preference}
        onChange={setTheme}
      />
    </Section>
  );
}

function FocusSection({ goalMinutes }: { goalMinutes: number }) {
  const autoChain = usePrefsStore((s) => s.autoChainCycles);
  const setAutoChain = usePrefsStore((s) => s.setAutoChainCycles);
  const [editing, setEditing] = useState(false);
  return (
    <Section title={fr.focus.title}>
      <View style={styles.goalRow}>
        <View style={styles.flex}>
          <AppText>{fr.focus.goalTitle}</AppText>
          <AppText variant="small">{fr.focus.goalValue(formatDuration(goalMinutes * 60))}</AppText>
        </View>
        <Button label={fr.common.edit} variant="secondary" onPress={() => setEditing(true)} />
      </View>
      <ToggleRow
        label={fr.focus.autoChain}
        hint={fr.focus.autoChainHint}
        value={autoChain}
        onChange={setAutoChain}
      />
      <DailyGoalDialog visible={editing} goalMinutes={goalMinutes} onClose={() => setEditing(false)} />
    </Section>
  );
}

function NotificationsSection() {
  const theme = useTheme();
  const notifyDeadlines = usePrefsStore((s) => s.notifyDeadlines);
  const notifyReview = usePrefsStore((s) => s.notifyReview);
  const setNotifyDeadlines = usePrefsStore((s) => s.setNotifyDeadlines);
  const setNotifyReview = usePrefsStore((s) => s.setNotifyReview);
  const notifyUpcoming = usePrefsStore((s) => s.notifyUpcoming);
  const setNotifyUpcoming = usePrefsStore((s) => s.setNotifyUpcoming);
  const leadMinutes = usePrefsStore((s) => s.upcomingLeadMinutes);
  const setLeadMinutes = usePrefsStore((s) => s.setUpcomingLeadMinutes);
  const [denied, setDenied] = useState(false);

  if (!notificationsSupported) {
    return (
      <Section title={fr.screens.settings.notifications}>
        <AppText variant="muted">{fr.screens.settings.notificationsWebOnly}</AppText>
      </Section>
    );
  }

  // Turning a reminder on asks for the permission first; it stays off if refused.
  const toggle = (setter: (enabled: boolean) => void) => async (enabled: boolean) => {
    if (!enabled) {
      setter(false);
      return;
    }
    const permission = await requestPermission();
    setDenied(permission !== 'granted');
    setter(permission === 'granted');
  };

  return (
    <Section title={fr.screens.settings.notifications}>
      <ToggleRow
        label={fr.screens.settings.deadlineReminders}
        hint={fr.screens.settings.deadlineRemindersHint}
        value={notifyDeadlines}
        onChange={toggle(setNotifyDeadlines)}
      />
      <ToggleRow
        label={fr.screens.settings.upcomingReminders}
        hint={fr.screens.settings.upcomingRemindersHint}
        value={notifyUpcoming}
        onChange={toggle(setNotifyUpcoming)}
      />
      {notifyUpcoming ? (
        <ChipSelect<number>
          label={fr.screens.settings.leadTime}
          options={LEAD_MINUTES_CHOICES.map((m) => ({ value: m, label: fr.screens.settings.leadMinutes(m) }))}
          value={leadMinutes}
          onChange={setLeadMinutes}
        />
      ) : null}
      <ToggleRow
        label={fr.screens.settings.reviewReminder}
        hint={fr.screens.settings.reviewReminderHint}
        value={notifyReview}
        onChange={toggle(setNotifyReview)}
      />
      {denied ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {fr.screens.settings.permissionDenied}
        </AppText>
      ) : null}
    </Section>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    // The whole row toggles, so the touch target is well over 44 px.
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}>
      <View style={styles.flex}>
        <AppText>{label}</AppText>
        <AppText variant="small">{hint}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  toggleRow: { minHeight: MIN_TOUCH + 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
