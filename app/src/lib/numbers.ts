/** DRF decimal string ("42.00") -> French display/input ("42", "10,5"); "" when null. */
export function formatDecimal(value: string | null): string {
  if (value === null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n).replace('.', ',') : value;
}
