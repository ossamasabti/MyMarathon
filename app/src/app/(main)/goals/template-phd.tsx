import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { type PlannedGoal, useApplyPhdTemplate, usePhdPreview } from '@/api/templates';
import { AppText } from '@/components/AppText';
import { HorizonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { DateField } from '@/components/DateField';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { formatDate, formatRange, todayISO } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const PREVIEW_DELAY_MS = 400;

/** "PhD path" template: preview the generated goal tree, then create it in one go. */
export default function PhdTemplateScreen() {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<string | null>(`${todayISO().slice(0, 8)}01`);
  const [years, setYears] = useState<3 | 4>(3);
  const [domainName, setDomainName] = useState<string>(fr.template.defaultDomain);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // The preview follows the title once typing pauses (one request, not one per key).
  const [previewTitle, setPreviewTitle] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setPreviewTitle(title.trim()), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title]);

  const params = previewTitle && startDate ? { start_date: startDate, years, thesis_title: previewTitle } : null;
  const preview = usePhdPreview(params);
  const apply = useApplyPhdTemplate();

  const apiError = apply.error instanceof ApiError ? apply.error : null;
  const errorsFor = (field: string) => [
    ...(localErrors[field] ? [localErrors[field]] : []),
    ...(apiError?.fieldErrors(field) ?? []),
  ];
  const knownFields = ['thesis_title', 'start_date', 'years', 'domain_name'];
  const otherError =
    apply.error && (!apiError || !knownFields.some((f) => apiError.fieldErrors(f).length)) ? apply.error.message : null;

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.thesis_title = fr.common.required;
    if (!startDate) errors.start_date = fr.common.required;
    if (!domainName.trim()) errors.domain_name = fr.common.required;
    setLocalErrors(errors);
    if (Object.keys(errors).length || !startDate) return;
    apply.mutate(
      { thesis_title: title.trim(), start_date: startDate, years, domain_name: domainName.trim() },
      { onSuccess: (result) => router.replace({ pathname: '/goals/[id]', params: { id: String(result.vision_id) } }) },
    );
  };

  return (
    <Screen>
      <Header title={fr.template.phdTitle} fallbackHref="/goals" />
      <AppText variant="muted">{fr.template.phdIntro}</AppText>

      <View style={styles.form}>
        <TextField
          label={fr.template.thesisTitle}
          value={title}
          onChangeText={setTitle}
          errors={errorsFor('thesis_title')}
          maxLength={200}
        />
        <DateField label={fr.template.startDate} value={startDate} onChange={setStartDate} errors={errorsFor('start_date')} />
        <ChipSelect<3 | 4>
          label={fr.template.duration}
          options={[
            { value: 3, label: fr.template.years(3) },
            { value: 4, label: fr.template.years(4) },
          ]}
          value={years}
          onChange={setYears}
          errors={errorsFor('years')}
        />
        <TextField
          label={fr.template.domainName}
          value={domainName}
          onChangeText={setDomainName}
          errors={errorsFor('domain_name')}
          maxLength={60}
        />
      </View>

      <Section title={fr.template.preview}>
        {params === null ? (
          <EmptyState message={fr.template.previewHint} />
        ) : preview.isPending ? (
          <LoadingState />
        ) : preview.isError ? (
          <ErrorState message={preview.error.message} onRetry={() => preview.refetch()} />
        ) : (
          <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <AppText variant="small" color={theme.textMuted}>
              {fr.template.counts(preview.data.counts.goals, preview.data.counts.tasks, preview.data.counts.habits)}
            </AppText>
            <PlanNode node={preview.data.plan} path="0" depth={0} />
          </View>
        )}
      </Section>

      {otherError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {otherError}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={fr.template.create} onPress={submit} loading={apply.isPending} />
      </View>
    </Screen>
  );
}

function PlanNode({ node, path, depth }: { node: PlannedGoal; path: string; depth: number }) {
  const theme = useTheme();
  // Vision and years open: the quarters are visible at a glance, months and tasks on demand.
  const [expanded, setExpanded] = useState(depth < 2);
  const hasContent = node.children.length > 0 || node.tasks.length > 0 || node.habits.length > 0;

  return (
    <View style={[depth > 0 && { marginLeft: spacing.md, borderLeftColor: theme.border, borderLeftWidth: 1 }]}>
      <View style={styles.header}>
        {hasContent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded ? fr.screens.goals.collapse(node.title) : fr.screens.goals.expand(node.title)
            }
            onPress={() => setExpanded((value) => !value)}
            style={styles.chevron}>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.chevron} />
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText style={styles.title}>{node.title}</AppText>
            <HorizonBadge horizon={node.horizon} />
          </View>
          <AppText variant="small" color={theme.textMuted}>
            {formatRange(node.start_date, node.end_date)}
            {node.target_value ? ` · ${fr.template.target(formatDecimal(node.target_value), node.unit)}` : ''}
          </AppText>
        </View>
      </View>

      {expanded ? (
        <View>
          {node.children.map((child, index) => (
            <PlanNode key={`${path}.${index}`} node={child} path={`${path}.${index}`} depth={depth + 1} />
          ))}
          {node.habits.map((habit) => (
            <PlanLeaf
              key={habit.title}
              icon="repeat-outline"
              title={habit.title}
              detail={habit.frequency === 'daily' ? fr.template.daily : fr.template.weekly}
            />
          ))}
          {node.tasks.map((task) => (
            <PlanLeaf key={task.title} icon="ellipse-outline" title={task.title} detail={formatDate(task.due_date)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PlanLeaf({ icon, title, detail }: { icon: 'repeat-outline' | 'ellipse-outline'; title: string; detail: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.leaf, { borderLeftColor: theme.border }]}>
      <View style={styles.chevron}>
        <Ionicons name={icon} size={18} color={theme.textMuted} />
      </View>
      <View style={styles.body}>
        <AppText variant="small">{title}</AppText>
        <AppText variant="small" color={theme.textMuted}>
          {detail}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  preview: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  chevron: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: spacing.sm, gap: 2, minHeight: MIN_TOUCH, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontWeight: '600' },
  leaf: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.md, borderLeftWidth: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
