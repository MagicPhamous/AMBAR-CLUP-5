export type PaymentCategory = 'efectivo' | 'qr' | 'tarjeta' | 'transferencia';

/**
 * Normalizes any payment method string (e.g., 'Tarjeta de Crédito', 'Pago QR Directo', 'Efectivo en Mano', 'Transferencia Bancaria', 'CARD', 'CASH', etc.)
 * into one of four standard payment breakdown categories: 'efectivo', 'qr', 'tarjeta', or 'transferencia'.
 */
export function parsePaymentCategory(methodStr: string | null | undefined): PaymentCategory {
  const pm = (methodStr || '').toLowerCase().trim();

  if (
    pm.includes('tarjeta') ||
    pm.includes('card') ||
    pm.includes('débito') ||
    pm.includes('debito') ||
    pm.includes('crédito') ||
    pm.includes('credito') ||
    pm.includes('pos')
  ) {
    return 'tarjeta';
  }

  if (pm.includes('qr')) {
    return 'qr';
  }

  if (
    pm.includes('transf') ||
    pm.includes('bancaria') ||
    pm.includes('banco') ||
    pm.includes('transfer')
  ) {
    return 'transferencia';
  }

  if (pm.includes('efectivo') || pm.includes('cash') || pm.includes('mano')) {
    return 'efectivo';
  }

  return 'efectivo';
}
