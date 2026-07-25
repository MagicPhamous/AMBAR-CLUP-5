/**
 * Utility functions for date formatting (DD-MM-AAAA)
 */

export function formatDateDDMMAAAA(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const dateOnly = trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [yyyy, mm, dd] = dateOnly.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return trimmed;
}

export function parseDDMMAAAAToYYYYMMDD(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim().replace(/\//g, '-');
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
}
