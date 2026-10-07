import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const receivingGet = vi.fn();
const attachmentsList = vi.fn();
const verify = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { receiving: { get: receivingGet, attachments: { list: attachmentsList } } };
    webhooks = { verify };
  },
}));
const uploadBuffer = vi.fn();
vi.mock('@/lib/server/upload/cloudinary-client', () => ({ uploadBuffer }));

const { ingestInboundEmail, verifyInboundWebhook } = await import('./report-inbound');
const { reportReplyAddress } = await import('./reports');

const REPORT = {
  id: 'cmreport0000000000000001',
  reporterEmail: 'fatou@example.com',
  status: 'resolved',
};
// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('REPORT_INBOUND_DOMAIN', 'reply.juula.store');
  vi.stubEnv('REPORT_INBOUND_SECRET', 'test-secret');
  vi.stubEnv('RESEND_INBOUND_WEBHOOK_SECRET', 'whsec_test');
  receivingGet.mockReset();
  attachmentsList.mockReset();
  uploadBuffer.mockReset();
  verify.mockReset();
  prismaMock.$transaction.mockImplementation(((fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock)) as never);
});

const event = (to: string) => ({
  email_id: 'em_1',
  from: 'Fatou <fatou@example.com>',
  to: [to],
  subject: 'Re: votre signalement',
});

describe('ingestInboundEmail', () => {
  it('attaches the reply (quote stripped, photo saved) and reopens a closed case', async () => {
    const address = reportReplyAddress(REPORT.id)!;
    expect(address).toMatch(
      /^signalement-cmreport0000000000000001-[a-f0-9]{12}@reply\.juula\.store$/,
    );
    prismaMock.report.findUnique.mockResolvedValue(REPORT as never);
    prismaMock.reportMessage.findUnique.mockResolvedValue(null);
    receivingGet.mockResolvedValue({
      data: {
        from: 'Fatou <fatou@example.com>',
        subject: 'Re: votre signalement',
        text: 'Voici la preuve.\n\nLe mar. 6 oct. 2026, Juula <support@juula.store> a écrit :\n> Bonjour',
        html: null,
        attachments: [{ id: 'a1' }],
      },
      error: null,
    });
    attachmentsList.mockResolvedValue({
      data: {
        data: [
          { content_type: 'image/png', size: PNG.length, download_url: 'https://dl/1' },
          { content_type: 'application/pdf', size: 10, download_url: 'https://dl/2' },
        ],
      },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(PNG)));
    uploadBuffer.mockResolvedValue({ secureUrl: 'https://res.cloudinary.com/x/reports/1.png' });
    prismaMock.reportMessage.create.mockResolvedValue({ id: 'msg1' } as never);

    const r = await ingestInboundEmail(event(`Support <${address}>`));

    expect(r).toEqual({ ok: true, reportId: REPORT.id, messageId: 'msg1' });
    const data = prismaMock.reportMessage.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      reportId: REPORT.id,
      kind: 'inbound',
      body: 'Voici la preuve.',
      inboundEmailId: 'em_1',
      fromEmail: 'fatou@example.com',
      attachments: ['https://res.cloudinary.com/x/reports/1.png'],
    });
    expect(uploadBuffer).toHaveBeenCalledTimes(1); // the PDF is skipped
    expect(prismaMock.report.update.mock.calls[0]![0].data).toEqual({ status: 'investigating' });
    vi.unstubAllGlobals();
  });

  it('ignores an address whose signature is wrong (no API call)', async () => {
    const forged = `signalement-${REPORT.id}-000000000000@reply.juula.store`;
    const r = await ingestInboundEmail(event(forged));
    expect(r).toEqual({ ok: true, ignored: 'not_a_report_address' });
    expect(receivingGet).not.toHaveBeenCalled();
  });

  it('is idempotent on the Resend e-mail id', async () => {
    prismaMock.report.findUnique.mockResolvedValue(REPORT as never);
    prismaMock.reportMessage.findUnique.mockResolvedValue({ id: 'old' } as never);
    const r = await ingestInboundEmail(event(reportReplyAddress(REPORT.id)!));
    expect(r).toEqual({ ok: true, reportId: REPORT.id, messageId: 'old' });
    expect(prismaMock.reportMessage.create).not.toHaveBeenCalled();
  });

  it('reports a fetch failure so Resend retries', async () => {
    prismaMock.report.findUnique.mockResolvedValue(REPORT as never);
    prismaMock.reportMessage.findUnique.mockResolvedValue(null);
    receivingGet.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const r = await ingestInboundEmail(event(reportReplyAddress(REPORT.id)!));
    expect(r).toEqual({ ok: false, error: 'not found' });
  });
});

describe('verifyInboundWebhook', () => {
  it('rejects missing headers or a bad signature', () => {
    expect(verifyInboundWebhook('{}', { id: null, timestamp: '1', signature: 'v1,x' })).toBeNull();
    verify.mockImplementation(() => {
      throw new Error('bad');
    });
    expect(verifyInboundWebhook('{}', { id: 'i', timestamp: '1', signature: 'v1,x' })).toBeNull();
  });
});
