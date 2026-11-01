import { Share } from 'react-native';

/** Mobile: no file system access needed, the text goes to the share sheet (mail, Drive, notes…). */
export async function shareTextFile(_fileName: string, text: string, title: string): Promise<void> {
  await Share.share({ message: text, title });
}
