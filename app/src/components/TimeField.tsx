import { useState } from 'react';

import { fr } from '@/i18n/fr';
import { formatTime, parseTime, type ClockTime } from '@/lib/time';

import { TextField } from './TextField';

interface TimeFieldProps {
  label: string;
  /** "HH:MM", or null when empty. */
  value: ClockTime | null;
  onChange: (value: ClockTime | null) => void;
  errors?: string[];
}

/** Text time input (HH:MM, "9h30" accepted). Same on web and mobile, like DateField. */
export function TimeField({ label, value, onChange, errors = [] }: TimeFieldProps) {
  const [text, setText] = useState(formatTime(value));
  const [invalid, setInvalid] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Keep the text in sync when the value is changed from outside (e.g. end computed from start).
  if (value !== lastValue) {
    setLastValue(value);
    setText(formatTime(value));
    setInvalid(false);
  }

  const commit = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setInvalid(false);
      setLastValue(null);
      onChange(null);
      return;
    }
    const parsed = parseTime(next);
    setInvalid(parsed === null);
    if (parsed) {
      setLastValue(parsed);
      onChange(parsed);
    }
  };

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={commit}
      placeholder={fr.time.placeholder}
      maxLength={5}
      errors={invalid ? [fr.time.invalid, ...errors] : errors}
    />
  );
}
