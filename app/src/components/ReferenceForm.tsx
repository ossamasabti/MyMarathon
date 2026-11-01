import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useReferenceTags } from '@/api/references';
import type { ReadingStatus, Reference, ReferenceInput, ReferenceKind } from '@/api/types';
import { fr } from '@/i18n/fr';
import { lookupDoi } from '@/lib/crossref';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { ChipSelect } from './ChipSelect';
import { GoalPicker } from './GoalPicker';
import { TextField } from './TextField';

const KINDS: readonly ReferenceKind[] = ['article', 'conference', 'book', 'thesis', 'preprint', 'other'];
const STATUSES: readonly ReadingStatus[] = ['to_read', 'reading', 'read'];
const SUGGESTED_TAGS = 8;

interface ReferenceFormProps {
  initial?: Reference;
  defaultGoal?: number | null;
  onSubmit: (input: Omit<ReferenceInput, 'notes'>) => void;
  pending: boolean;
  error: Error | null;
}

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ReferenceForm({ initial, defaultGoal = null, onSubmit, pending, error }: ReferenceFormProps) {
  const theme = useTheme();
  const knownTags = useReferenceTags();
  const [doi, setDoi] = useState(initial?.doi ?? '');
  const [kind, setKind] = useState<ReferenceKind>(initial?.kind ?? 'article');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [authors, setAuthors] = useState(initial?.authors ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [goal, setGoal] = useState<number | null>(initial?.goal ?? defaultGoal);
  const [status, setStatus] = useState<ReadingStatus>(initial?.status ?? 'to_read');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [lookup, setLookup] = useState<{ pending: boolean; message: string | null; ok: boolean }>({
    pending: false,
    message: null,
    ok: false,
  });

  const apiError = error instanceof ApiError ? error : null;
  const errorsFor = (field: string) => [
    ...(localErrors[field] ? [localErrors[field]] : []),
    ...(apiError?.fieldErrors(field) ?? []),
  ];
  const knownFields = ['kind', 'title', 'authors', 'year', 'venue', 'doi', 'url', 'tags', 'goal', 'status'];
  const otherError =
    error && (!apiError || !knownFields.some((f) => apiError.fieldErrors(f).length)) ? error.message : null;

  const fillFromDoi = async () => {
    if (!doi.trim()) return;
    setLookup({ pending: true, message: null, ok: false });
    try {
      const found = await lookupDoi(doi);
      if (!found) {
        setLookup({ pending: false, message: fr.reference.doiNotFound, ok: false });
        return;
      }
      setKind(found.kind);
      setTitle(found.title);
      setAuthors(found.authors);
      setYear(found.year ? String(found.year) : '');
      setVenue(found.venue);
      setDoi(found.doi);
      if (found.url) setUrl(found.url);
      setLookup({ pending: false, message: fr.reference.doiFilled, ok: true });
    } catch {
      setLookup({ pending: false, message: fr.reference.doiNetworkError, ok: false });
    }
  };

  const currentTags = parseTags(tags);
  const suggestions = (knownTags.data ?? [])
    .map((t) => t.tag)
    .filter((t) => !currentTags.some((c) => c.toLowerCase() === t.toLowerCase()))
    .slice(0, SUGGESTED_TAGS);

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = fr.common.required;
    if (year.trim() && !/^\d{4}$/.test(year.trim())) errors.year = fr.reference.yearInvalid;
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;
    onSubmit({
      kind,
      title: title.trim(),
      authors: authors.trim(),
      year: year.trim() ? Number(year.trim()) : null,
      venue: venue.trim(),
      doi: doi.trim(),
      url: url.trim(),
      tags: currentTags,
      goal,
      status,
    });
  };

  return (
    <View style={styles.form}>
      <View style={styles.doiRow}>
        <View style={styles.flex}>
          <TextField
            label={fr.reference.doi}
            value={doi}
            onChangeText={setDoi}
            placeholder={fr.reference.doiPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            errors={errorsFor('doi')}
          />
        </View>
        <Button
          label={fr.reference.fillFromDoi}
          variant="secondary"
          onPress={fillFromDoi}
          loading={lookup.pending}
          disabled={!doi.trim()}
        />
      </View>
      {lookup.message ? (
        <AppText variant="small" color={lookup.ok ? theme.success : theme.danger} accessibilityRole="alert">
          {lookup.message}
        </AppText>
      ) : null}

      <ChipSelect
        label={fr.reference.kind}
        options={KINDS.map((k) => ({ value: k, label: fr.reference.kinds[k] }))}
        value={kind}
        onChange={setKind}
        errors={errorsFor('kind')}
      />
      <TextField label={fr.reference.title} value={title} onChangeText={setTitle} errors={errorsFor('title')} multiline />
      <TextField
        label={fr.reference.authors}
        value={authors}
        onChangeText={setAuthors}
        placeholder={fr.reference.authorsHint}
        errors={errorsFor('authors')}
      />
      <View style={styles.row}>
        <View style={styles.year}>
          <TextField
            label={fr.reference.year}
            value={year}
            onChangeText={setYear}
            inputMode="numeric"
            maxLength={4}
            errors={errorsFor('year')}
          />
        </View>
        <View style={styles.flex}>
          <TextField label={fr.reference.venue} value={venue} onChangeText={setVenue} errors={errorsFor('venue')} />
        </View>
      </View>
      <TextField
        label={fr.reference.url}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="url"
        errors={errorsFor('url')}
      />
      <TextField
        label={fr.reference.tags}
        value={tags}
        onChangeText={setTags}
        placeholder={fr.reference.tagsHint}
        errors={errorsFor('tags')}
      />
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((tag) => (
            <Button
              key={tag}
              label={`+ ${tag}`}
              variant="ghost"
              onPress={() => setTags([...currentTags, tag].join(', '))}
            />
          ))}
        </View>
      ) : null}
      <GoalPicker
        label={fr.reference.goal}
        value={goal}
        onChange={setGoal}
        noneLabel={fr.reference.noGoal}
        errors={errorsFor('goal')}
      />
      <ChipSelect
        label={fr.reference.status}
        options={STATUSES.map((s) => ({ value: s, label: fr.reference.statuses[s] }))}
        value={status}
        onChange={setStatus}
        errors={errorsFor('status')}
      />

      {otherError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {otherError}
        </AppText>
      ) : null}
      <Button label={fr.common.save} onPress={submit} loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  doiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  year: { width: 110 },
  flex: { flex: 1, minWidth: 180 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
