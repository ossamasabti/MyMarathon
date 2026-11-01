import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDomains } from '@/api/domains';
import { useGoalTree } from '@/api/goals';
import { AppText } from '@/components/AppText';
import { DomainDot } from '@/components/Badge';
import { Button } from '@/components/Button';
import { GoalTree } from '@/components/GoalTree';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

export default function GoalTreeScreen() {
  const theme = useTheme();
  const display = useDomainColor();
  const tree = useGoalTree();
  const domains = useDomains();

  return (
    <Screen title={fr.nav.goals}>
      <Section title={fr.screens.goals.domains}>
        <View style={styles.chips}>
          {(domains.data ?? []).map((domain) => (
            <Pressable
              key={domain.id}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/domains/[id]', params: { id: String(domain.id) } })}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: display(domain.color), backgroundColor: theme.surface },
                pressed && { opacity: 0.7 },
              ]}>
              <DomainDot color={domain.color} />
              <AppText variant="small" color={theme.text}>
                {domain.name}
              </AppText>
            </Pressable>
          ))}
          <Button label={`+ ${fr.domain.add}`} variant="ghost" onPress={() => router.push('/domains/new')} />
        </View>
        {domains.isError ? <ErrorState message={domains.error.message} onRetry={() => domains.refetch()} /> : null}
      </Section>

      <View style={styles.actions}>
        <Button label={fr.template.fromTemplate} variant="ghost" onPress={() => router.push('/goals/template-phd')} />
        <Button label={`+ ${fr.goal.add}`} onPress={() => router.push('/goals/new')} />
      </View>

      {tree.isPending ? (
        <LoadingState />
      ) : tree.isError ? (
        <ErrorState message={tree.error.message} onRetry={() => tree.refetch()} />
      ) : tree.data.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState message={fr.screens.goals.empty} hint={fr.screens.goals.emptyHint} />
          <Button label={fr.template.phdTitle} variant="secondary" onPress={() => router.push('/goals/template-phd')} />
        </View>
      ) : (
        <GoalTree nodes={tree.data} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm },
});
