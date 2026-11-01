import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDeleteReference, useReference, useSaveReference } from '@/api/references';
import type { ReadingNoteKey, Reference } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge, HorizonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/Dialog';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ReadingStatusButton, shortCitation } from '@/components/ReferenceRow';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';
import { useNumberParam } from '@/lib/params';
import { READING_QUESTIONS } from '@/lib/readingQuestions';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export default function ReferenceDetailScreen() {
  const id = useNumberParam('id');
  const reference = useReference(id);

  if (reference.isPending || reference.isError) {
    const notFound = reference.error instanceof ApiError && reference.error.status === 404;
    return (
      <Screen>
        <Header title={fr.nav.references} fallbackHref="/references" />
        {reference.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState
            message={notFound ? fr.reference.notFound : reference.error.message}
            onRetry={notFound ? undefined : () => reference.refetch()}
          />
        )}
      </Screen>
    );
  }
  // Keyed so that the notes reset when another reference is opened in the same screen.
  return <ReferenceDetail key={reference.data.id} reference={reference.data} />;
}

function ReferenceDetail({ reference }: { reference: Reference }) {
  const theme = useTheme();
  const remove = useDeleteReference();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const link = reference.doi ? `https://doi.org/${reference.doi}` : reference.url;
  const meta = shortCitation(reference);

  return (
    <Screen>
      <Header
        title={fr.nav.references}
        fallbackHref="/references"
        right={
          <>
            <IconButton
              icon="create-outline"
              label={fr.common.edit}
              onPress={() => router.push({ pathname: '/references/[id]/edit', params: { id: String(reference.id) } })}
            />
            <IconButton
              icon="trash-outline"
              label={fr.common.delete}
              color={theme.danger}
              onPress={() => setConfirmDelete(true)}
            />
          </>
        }
      />

      <Section>
        <AppText variant="heading">{reference.title}</AppText>
        {reference.authors ? <AppText>{reference.authors.split(';').map((a) => a.trim()).join(' · ')}</AppText> : null}
        {meta ? (
          <AppText variant="small" color={theme.textMuted}>
            {`${fr.reference.kinds[reference.kind]} · ${meta}`}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <ReadingStatusButton reference={reference} />
          {reference.read_at ? (
            <AppText variant="small" color={theme.textMuted}>
              {fr.reference.readOn(formatDate(reference.read_at.slice(0, 10)))}
            </AppText>
          ) : null}
        </View>
        {reference.tags.length ? (
          <View style={styles.meta}>
            {reference.tags.map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </View>
        ) : null}
        {reference.goal_ref ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(reference.goal_ref?.id) } })}
            style={styles.goal}>
            <HorizonBadge horizon={reference.goal_ref.horizon} />
            <AppText variant="small" color={theme.primary} style={styles.flex}>
              {reference.goal_ref.title}
            </AppText>
          </Pressable>
        ) : null}
        <View style={styles.meta}>
          <AppText variant="small" color={theme.textMuted}>
            {`${fr.reference.citation} :`}
          </AppText>
          <AppText variant="small" selectable>
            {`\\cite{${reference.citation_key}}`}
          </AppText>
        </View>
        {link ? <Button label={fr.reference.openLink} variant="secondary" onPress={() => Linking.openURL(link)} /> : null}
      </Section>

      <ReadingNotes reference={reference} />

      <ConfirmDialog
        visible={confirmDelete}
        title={fr.common.confirmDelete}
        message={fr.reference.deleteWarning}
        confirmLabel={fr.common.delete}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(reference.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              router.replace('/references');
            },
          })
        }
      />
    </Screen>
  );
}

function ReadingNotes({ reference }: { reference: Reference }) {
  const theme = useTheme();
  const save = useSaveReference(reference.id);
  const [notes, setNotes] = useState<Partial<Record<ReadingNoteKey, string>>>(reference.notes);
  const [saved, setSaved] = useState(false);

  return (
    <Section title={fr.reference.readingNotes}>
      <View style={styles.notes}>
        {READING_QUESTIONS.map((question) => (
          <TextField
            key={question.key}
            label={question.label}
            placeholder={question.placeholder}
            value={notes[question.key] ?? ''}
            onChangeText={(text) => {
              setNotes((prev) => ({ ...prev, [question.key]: text }));
              setSaved(false);
            }}
            multiline
          />
        ))}
        {save.isError ? (
          <AppText color={theme.danger} accessibilityRole="alert">
            {save.error.message}
          </AppText>
        ) : null}
        {saved ? (
          <AppText color={theme.success} accessibilityRole="alert">
            {`✓ ${fr.reference.notesSaved}`}
          </AppText>
        ) : null}
        <Button
          label={fr.reference.saveNotes}
          onPress={() => save.mutate({ notes }, { onSuccess: () => setSaved(true) })}
          loading={save.isPending}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH },
  flex: { flex: 1 },
  notes: { gap: spacing.md },
});
