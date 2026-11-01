import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { nextReadingStatus, useSetReadingStatus } from '@/api/references';
import type { ReadingStatus, Reference } from '@/api/types';
import { fr } from '@/i18n/fr';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Badge } from './Badge';

const STATUS_ICONS: Record<ReadingStatus, ComponentProps<typeof Ionicons>['name']> = {
  to_read: 'bookmark-outline',
  reading: 'book-outline',
  read: 'checkmark-circle',
};

/** "Cortes et al., 1995 · Machine Learning". */
export function shortCitation(ref: Pick<Reference, 'authors' | 'year' | 'venue'>): string {
  const names = ref.authors
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean);
  const first = names[0];
  const last = (name: string) => (name.includes(',') ? (name.split(',')[0] ?? name) : (name.split(' ').pop() ?? name));
  const who = first === undefined ? '' : names.length === 1 ? last(first).trim() : `${last(first).trim()} et al.`;
  const head = [who, ref.year ?? ''].filter(Boolean).join(', ');
  return [head, ref.venue].filter(Boolean).join(' · ');
}

/** Status pill: icon + label (never color alone); tapping moves to the next status. */
export function ReadingStatusButton({ reference }: { reference: Pick<Reference, 'id' | 'title' | 'status'> }) {
  const theme = useTheme();
  const setStatus = useSetReadingStatus();
  const label = fr.reference.statuses[reference.status];
  const read = reference.status === 'read';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fr.reference.statusAction(reference.title, label)}
      onPress={() => setStatus.mutate({ id: reference.id, status: nextReadingStatus(reference.status) })}
      style={({ pressed }) => [
        styles.status,
        { borderColor: read ? theme.success : theme.border, backgroundColor: theme.surfaceAlt },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={STATUS_ICONS[reference.status]} size={16} color={read ? theme.success : theme.textMuted} />
      <AppText variant="small" color={theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ReferenceRow({ reference }: { reference: Reference }) {
  const theme = useTheme();
  const meta = shortCitation(reference);
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/references/[id]', params: { id: String(reference.id) } })}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
        <AppText style={styles.title} numberOfLines={3}>
          {reference.title}
        </AppText>
        {meta ? (
          <AppText variant="small" color={theme.textMuted} numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
        {reference.tags.length ? (
          <View style={styles.tags}>
            {reference.tags.map((tag) => (
              <Badge key={tag} label={tag} />
            ))}
          </View>
        ) : null}
      </Pressable>
      <ReadingStatusButton reference={reference} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  body: { flex: 1, gap: spacing.xs, minHeight: MIN_TOUCH, justifyContent: 'center' },
  title: { fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  status: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
