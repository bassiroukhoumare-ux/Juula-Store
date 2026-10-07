import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();
class FakeWebPushError extends Error {
  constructor(public statusCode: number) {
    super(`push ${statusCode}`);
  }
}
vi.mock('web-push', () => ({
  default: { sendNotification, setVapidDetails },
  WebPushError: FakeWebPushError,
}));

const sub = (id: string) =>
  ({
    id,
    userId: 'u1',
    endpoint: `https://push.example/${id}`,
    keysP256dh: 'p'.repeat(40),
    keysAuth: 'a'.repeat(16),
    failures: 0,
  }) as never;

let push: typeof import('./push');

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'pub');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'priv');
  sendNotification.mockReset();
  push = await import('./push');
  prismaMock.pushSubscription.update.mockResolvedValue({ failures: 1 } as never);
  prismaMock.pushSubscription.delete.mockResolvedValue({} as never);
});

describe('sendPushNotification', () => {
  it('sends the JSON payload with a same-origin URL only', async () => {
    sendNotification.mockResolvedValue({});
    const r = await push.sendPushNotification(sub('s1'), {
      title: 'Bonjour',
      body: 'Test',
      url: 'https://evil.example/phish',
    });
    expect(r).toBe('sent');
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string);
    expect(payload).toMatchObject({ title: 'Bonjour', body: 'Test', url: '/dashboard' });
  });

  it.each([404, 410])('deletes the subscription when the push service answers %i', async (code) => {
    sendNotification.mockRejectedValue(new FakeWebPushError(code));
    const r = await push.sendPushNotification(sub('s2'), { title: 't', body: 'b' });
    expect(r).toBe('removed');
    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's2' } });
  });

  it('keeps the subscription on a temporary error (counts the failure)', async () => {
    sendNotification.mockRejectedValue(new FakeWebPushError(503));
    const r = await push.sendPushNotification(sub('s3'), { title: 't', body: 'b' });
    expect(r).toBe('failed');
    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it('is a no-op without VAPID keys', async () => {
    vi.resetModules();
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    const fresh = await import('./push');
    expect(await fresh.sendPushNotification(sub('s4'), { title: 't', body: 'b' })).toBe('failed');
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe('sendPushToUser / pushNewOrder', () => {
  it('reports sent / removed per device', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([sub('a'), sub('b')] as never);
    sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce(new FakeWebPushError(410));
    const r = await push.sendPushToUser('u1', { title: 't', body: 'b' });
    expect(r).toEqual({ sent: 1, failed: 0, removed: 1 });
  });

  it('notifies the merchant of a new order with a deep link to it', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      merchantId: 'm1',
      reference: 'CMD-AWA-000042',
      customerName: 'Fatou',
      totalAmount: 25000,
      productName: 'Montre',
    } as never);
    prismaMock.pushSubscription.findMany.mockResolvedValue([sub('d1')] as never);
    sendNotification.mockResolvedValue({});
    await push.pushNewOrder('o1');
    const payload = JSON.parse(sendNotification.mock.calls[0]![1] as string);
    expect(payload.title).toBe('Nouvelle commande CMD-AWA-000042 reçue !');
    expect(payload.body).toBe('Fatou · 25 000 FCFA · Montre');
    expect(payload.url).toBe('/dashboard?commande=CMD-AWA-000042');
  });
});
