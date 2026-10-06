import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/store/profile', () => ({
  isAllowedLogoUrl: (u: string) => u.startsWith('https://res.cloudinary.com/'),
}));

import type { Store } from '@prisma/client';
import { decidePayment } from './checkout';

const base = {
  plan: 'PRO',
  planExpiresAt: null,
  whatsapp: '+221 77 123 45 67',
  codEnabled: true,
  onlinePaymentsEnabled: false,
  directPaymentMethods: [
    { id: 'm1', name: 'Wave Business', url: 'https://pay.wave.com/m/x', qrUrl: null },
  ],
} as unknown as Store;

describe('decidePayment', () => {
  it('COD and direct links', () => {
    expect(decidePayment(base, 'cod')).toMatchObject({ ok: true, paymentStatus: 'pending_cod' });
    expect(decidePayment(base, 'direct', 'm1')).toMatchObject({
      ok: true,
      paymentStatus: 'pending_direct',
      paymentMethodName: 'Wave Business',
    });
    expect(decidePayment(base, 'direct', 'unknown')).toMatchObject({ ok: false });
  });

  it('COD switched off', () => {
    const noCod = { ...base, codEnabled: false } as Store;
    expect(decidePayment(noCod, 'cod')).toMatchObject({ ok: false, error: 'COD_DISABLED' });
  });

  it('online payment only when JuulaPay is enabled', () => {
    expect(decidePayment(base, 'online_momo')).toMatchObject({
      ok: false,
      error: 'ONLINE_PAYMENT_DISABLED',
    });
    const online = { ...base, onlinePaymentsEnabled: true } as Store;
    expect(decidePayment(online, 'online_momo')).toMatchObject({
      ok: true,
      paymentStatus: 'pending_online',
    });
  });

  it('WhatsApp order needs the store number', () => {
    expect(decidePayment(base, 'whatsapp')).toMatchObject({
      ok: true,
      paymentStatus: 'pending_cod',
      paymentMethodName: 'WhatsApp',
    });
    const noNumber = { ...base, whatsapp: null } as unknown as Store;
    expect(decidePayment(noNumber, 'whatsapp')).toMatchObject({ ok: false });
  });
});
