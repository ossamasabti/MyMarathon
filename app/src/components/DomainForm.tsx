import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { DomainInput } from '@/api/domains';
import type { Domain } from '@/api/types';
import { fr } from '@/i18n/fr';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { DOMAIN_PALETTE, useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Validated categorical palette (see theme/domainColors.ts); the light step is stored. */
export const DOMAIN_COLORS: readonly string[] = DOMAIN_PALETTE.map((c) => c.light);

export const DOMAIN_ICONS: IconName[] = [
  'heart-outline',
  'briefcase-outline',
  'school-outline',
  'people-outline',
  'wallet-outline',
  'barbell-outline',
  'home-outline',
  'color-palette-outline',
  'leaf-outline',
  'airplane-outline',
];

interface DomainFormProps {
  initial?: Domain;
  /** Colors already taken: a new domain gets the next free palette slot. */
  usedColors?: string[];
  onSubmit: (input: DomainInput) => void;
  pending: boolean;
  error: Error | null;
}

export function DomainForm({ initial, usedColors = [], onSubmit, pending, error }: DomainFormProps) {
  const theme = useTheme();
  const display = useDomainColor();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(
    () =>
      initial?.color ??
      DOMAIN_COLORS.find((c) => !usedColors.map((u) => u.toUpperCase()).includes(c)) ??
      DOMAIN_PALETTE[0].light,
  );
  const [icon, setIcon] = useState(initial?.icon ?? DOMAIN_ICONS[0] ?? 'heart-outline');
  const [missingName, setMissingName] = useState(false);

  const apiError = error instanceof ApiError ? error : null;
  const nameErrors = [...(missingName ? [fr.common.required] : []), ...(apiError?.fieldErrors('name') ?? [])];
  const otherError = error && !apiError?.fieldErrors('name').length ? error.message : null;

  const submit = () => {
    setMissingName(!name.trim());
    if (name.trim()) onSubmit({ name: name.trim(), color, icon });
  };

  return (
    <View style={styles.form}>
      <TextField label={fr.domain.name} value={name} onChangeText={setName} errors={nameErrors} />

      <AppText variant="small" color={theme.text}>
        {fr.domain.color}
      </AppText>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {DOMAIN_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityLabel={c}
            accessibilityState={{ selected: c === color }}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: display(c), borderColor: c === color ? theme.text : 'transparent' }]}>
            {c === color ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
          </Pressable>
        ))}
      </View>

      <AppText variant="small" color={theme.text}>
        {fr.domain.icon}
      </AppText>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {DOMAIN_ICONS.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected: name === icon }}
            onPress={() => setIcon(name)}
            style={[
              styles.swatch,
              {
                backgroundColor: name === icon ? theme.primarySoft : theme.surfaceAlt,
                borderColor: name === icon ? theme.primary : theme.border,
              },
            ]}>
            <Ionicons name={name} size={22} color={name === icon ? display(color) : theme.textMuted} />
          </Pressable>
        ))}
      </View>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
