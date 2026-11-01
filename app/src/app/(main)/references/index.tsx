import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { exportBibtex, useReferences, useReferenceTags } from '@/api/references';
import type { ReadingStatus } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { ReferenceRow } from '@/components/ReferenceRow';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { shareTextFile } from '@/lib/textFile';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const SEARCH_DELAY_MS = 300;
const STATUSES: readonly ReadingStatus[] = ['to_read', 'reading', 'read'];

/** Bibliography: search, filter by status and keyword, export to BibTeX. */
export default function ReferencesScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReadingStatus | 'all'>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [exportState, setExportState] = useState<{ pending: boolean; message: string | null }>({
    pending: false,
    message: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Status is filtered here so that every status chip can show its count.
  const references = useReferences({ q: query, tag: tag ?? undefined });
  const tags = useReferenceTags();
  const all = references.data ?? [];
  const shown = status === 'all' ? all : all.filter((r) => r.status === status);
  const count = (s: ReadingStatus) => all.filter((r) => r.status === s).length;
  const filtered = query !== '' || tag !== null || status !== 'all';

  const runExport = async () => {
    setExportState({ pending: true, message: null });
    try {
      const result = await exportBibtex({ q: query, tag: tag ?? undefined, status: status === 'all' ? undefined : status });
      if (result.count === 0) {
        setExportState({ pending: false, message: fr.reference.exportEmpty });
        return;
      }
      await shareTextFile('bibliographie.bib', result.bibtex, fr.reference.exportTitle);
      setExportState({ pending: false, message: fr.reference.exported(result.count) });
    } catch (error) {
      setExportState({ pending: false, message: error instanceof Error ? error.message : fr.common.genericError });
    }
  };

  return (
    <Screen title={fr.nav.references}>
      <View style={styles.actions}>
        <Button
          label={fr.reference.exportBibtex}
          variant="ghost"
          onPress={runExport}
          loading={exportState.pending}
          disabled={all.length === 0}
        />
        <Button label={`+ ${fr.reference.add}`} onPress={() => router.push('/references/new')} />
      </View>
      {exportState.message ? (
        <AppText variant="small" color={theme.textMuted} accessibilityRole="alert" style={styles.right}>
          {exportState.message}
        </AppText>
      ) : null}

      <TextField
        label={fr.reference.search}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ChipSelect<ReadingStatus | 'all'>
        options={[
          { value: 'all', label: `${fr.reference.all} (${all.length})` },
          ...STATUSES.map((s) => ({ value: s, label: `${fr.reference.statuses[s]} (${count(s)})` })),
        ]}
        value={status}
        onChange={setStatus}
      />
      {tags.data && tags.data.length > 0 ? (
        <ChipSelect<string | null>
          label={fr.reference.tags}
          options={[
            { value: null, label: fr.reference.all },
            ...tags.data.map((t) => ({ value: t.tag, label: `${t.tag} (${t.count})` })),
          ]}
          value={tag}
          onChange={setTag}
        />
      ) : null}

      <Section title={fr.reference.count(shown.length)}>
        {references.isPending ? (
          <LoadingState />
        ) : references.isError ? (
          <ErrorState message={references.error.message} onRetry={() => references.refetch()} />
        ) : shown.length === 0 ? (
          filtered ? (
            <EmptyState message={fr.reference.noMatch} />
          ) : (
            <EmptyState message={fr.reference.empty} hint={fr.reference.emptyHint} />
          )
        ) : (
          shown.map((reference) => <ReferenceRow key={reference.id} reference={reference} />)
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  right: { textAlign: 'right' },
});
