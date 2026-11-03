import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { elevation, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

interface DialogProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** In-app modal (browser dialogs are avoided: they block the page and look out of place). */
export function Dialog({ visible, title, onClose, children }: DialogProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={fr.common.close}>
        {/* Stop presses inside the card from closing the dialog. */}
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: theme.surface }, elevation(theme.shadow, 2)]}
          accessibilityViewIsModal>
          <AppText variant="heading">{title}</AppText>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <Dialog visible={visible} title={title} onClose={onCancel}>
      <AppText variant="muted">{message}</AppText>
      <View style={styles.actions}>
        <Button label={fr.common.cancel} variant="secondary" onPress={onCancel} />
        <Button label={confirmLabel} variant="danger" onPress={onConfirm} loading={loading} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg + 4,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
});
