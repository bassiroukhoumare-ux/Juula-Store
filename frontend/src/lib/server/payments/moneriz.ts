import crypto from 'node:crypto';

export interface MonerizConfig {
  apiUrl: string;
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
}

export interface CreateCheckoutSessionParams {
  amount: number; // Integer in XOF (min 100, max 5,000,000)
  title: string;
  reference: string;
  country?: 'SN' | 'CI' | 'BF' | 'ML' | 'TG' | 'BJ';
  currency?: string;
  metadata?: Record<string, any>;
  integrationMode?: 'redirect' | 'iframe';
  embedOrigin?: string;
  successUrl?: string;
  cancelUrl?: string;
  expiresInMinutes?: number;
  idempotencyKey?: string;
}

export interface MonerizCheckoutSession {
  id: string; // cs_...
  object: 'checkout_session';
  mode: 'test' | 'live';
  status: 'open' | 'processing' | 'complete' | 'expired' | 'disabled' | 'reversed';
  checkoutUrl: string;
  embedUrl: string | null;
  url: string;
  integrationMode: 'redirect' | 'iframe';
  paymentId: string | null;
  paymentStatus: string | null;
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  successUrl?: string | null;
  cancelUrl?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreatePaymentParams {
  amount: number;
  currency?: string;
  country?: string;
  paymentType: 'wave_money' | 'orange_money' | 'card' | 'mtn_money' | 'moov' | string;
  reference?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    country?: string;
  };
  otp?: string;
  description?: string;
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

export interface CreateWithdrawalParams {
  amount: number; // Integer, min 1000 XOF
  currency?: string;
  country?: string;
  paymentType: 'wave_money' | 'orange_money' | 'mtn_money' | 'moov';
  destination: {
    phone: string;
    name: string;
    email?: string;
  };
  reason?: string;
  idempotencyKey?: string;
}

export interface MonerizBalance {
  currency: string;
  available: number;
  pendingSettlement: number;
  pendingWithdrawals: number;
  nextSettlementAt: string | null;
}

export class MonerizApiError extends Error {
  code: string;
  param?: string | undefined;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400, param?: string | undefined) {
    super(`[Moneriz ${code}] ${message}${param ? ` (param: ${param})` : ''}`);
    this.name = 'MonerizApiError';
    this.code = code;
    this.param = param;
    this.statusCode = statusCode;
  }
}

export function getMonerizConfig(): MonerizConfig {
  const secretKey = process.env.MONERIZ_SECRET_KEY || '';
  const publicKey = process.env.MONERIZ_PUBLIC_KEY || process.env.NEXT_PUBLIC_MONERIZ_PUBLIC_KEY || '';
  const webhookSecret = process.env.MONERIZ_WEBHOOK_SECRET || '';
  const apiUrl = (process.env.MONERIZ_API_URL || 'https://api.moneriz.com/v1').replace(/\/+$/, '');

  return {
    apiUrl,
    secretKey,
    publicKey,
    webhookSecret,
  };
}

/**
 * Ensures a valid 16-128 chars idempotency key
 */
function normalizeIdempotencyKey(key?: string): string {
  if (key && key.length >= 16 && key.length <= 128) {
    return key;
  }
  const cleanKey = (key || 'idem').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${cleanKey}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`.slice(0, 64);
}

/**
 * Executes an authenticated request against the Moneriz API
 */
async function monerizFetch<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    idempotencyKey?: string;
    usePublicKey?: boolean;
  } = {}
): Promise<T> {
  const config = getMonerizConfig();
  const token = options.usePublicKey ? config.publicKey : config.secretKey;

  if (!token) {
    throw new MonerizApiError(
      'CONFIG_MISSING',
      options.usePublicKey
        ? 'Clé publique Moneriz manquante (MONERIZ_PUBLIC_KEY)'
        : 'Clé secrète Moneriz manquante (MONERIZ_SECRET_KEY)',
      401
    );
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${config.apiUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = normalizeIdempotencyKey(options.idempotencyKey);
  }

  const fetchOptions: RequestInit = {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers,
    cache: 'no-store',
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errObj = data?.error;
    throw new MonerizApiError(
      errObj?.code || `HTTP_${res.status}`,
      errObj?.message || 'Erreur lors de la requête vers Moneriz',
      res.status,
      errObj?.param
    );
  }

  return data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHECKOUT SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createMonerizCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<MonerizCheckoutSession> {
  try {
    return await monerizFetch<MonerizCheckoutSession>('/checkout-sessions', {
      method: 'POST',
      idempotencyKey: params.idempotencyKey || `cs-${params.reference}`,
      body: {
        amount: Math.round(params.amount),
        currency: params.currency || 'XOF',
        title: params.title.slice(0, 100),
        reference: params.reference,
        country: params.country || 'SN',
        metadata: params.metadata || {},
        integrationMode: params.integrationMode || 'redirect',
        embedOrigin: params.integrationMode === 'iframe' ? params.embedOrigin : undefined,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        expiresInMinutes: params.expiresInMinutes || 60,
      },
    });
  } catch (err: any) {
    if (err?.code === 'EMBED_NOT_CONFIGURED' && params.integrationMode === 'iframe') {
      console.warn('[Moneriz] Origine iframe non autorisée dans Moneriz dashboard, bascule automatique vers mode redirect');
      return await monerizFetch<MonerizCheckoutSession>('/checkout-sessions', {
        method: 'POST',
        idempotencyKey: `${params.idempotencyKey || `cs-${params.reference}`}-fallback`,
        body: {
          amount: Math.round(params.amount),
          currency: params.currency || 'XOF',
          title: params.title.slice(0, 100),
          reference: params.reference,
          country: params.country || 'SN',
          metadata: params.metadata || {},
          integrationMode: 'redirect',
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          expiresInMinutes: params.expiresInMinutes || 60,
        },
      });
    }
    throw err;
  }
}

export async function getMonerizCheckoutSession(
  id: string
): Promise<MonerizCheckoutSession> {
  return monerizFetch<MonerizCheckoutSession>(`/checkout-sessions/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAYMENTS DIRECTS
// ─────────────────────────────────────────────────────────────────────────────

export async function createMonerizPayment(params: CreatePaymentParams): Promise<any> {
  return monerizFetch('/payments', {
    method: 'POST',
    idempotencyKey: params.idempotencyKey || `pay-${params.reference || Date.now()}`,
    body: {
      amount: Math.round(params.amount),
      currency: params.currency || 'XOF',
      country: params.country || 'SN',
      paymentType: params.paymentType,
      reference: params.reference,
      customer: params.customer,
      otp: params.otp,
      description: params.description,
      metadata: params.metadata,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    },
  });
}

export async function getMonerizPayment(id: string): Promise<any> {
  return monerizFetch(`/payments/${id}`);
}

export async function getMonerizPaymentMethods(): Promise<any> {
  return monerizFetch('/payment-methods', { usePublicKey: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BALANCE & WITHDRAWALS (RETRAITS MARCHAND)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMonerizBalance(): Promise<MonerizBalance> {
  return monerizFetch<MonerizBalance>('/balance');
}

export async function createMonerizWithdrawal(params: CreateWithdrawalParams): Promise<any> {
  return monerizFetch('/withdrawals', {
    method: 'POST',
    idempotencyKey: params.idempotencyKey || `wd-${Date.now()}-${params.amount}`,
    body: {
      amount: Math.round(params.amount),
      currency: params.currency || 'XOF',
      country: params.country || 'SN',
      paymentType: params.paymentType,
      destination: params.destination,
      reason: params.reason || 'Retrait des ventes Juula Store',
    },
  });
}

export async function getMonerizWithdrawal(id: string): Promise<any> {
  return monerizFetch(`/withdrawals/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SIGNATURE WEBHOOK VÉRIFICATION STRICTE (Algorithme Officiel Moneriz)
// ─────────────────────────────────────────────────────────────────────────────

const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export function verifyMonerizSignature(
  rawBody: string,
  secret: string,
  header: string
): boolean {
  if (!header || !secret || !rawBody) return false;

  // 1. Découper `t=<unix_ms>,v1=<hex>`
  let t: string | undefined;
  let v1: string | undefined;

  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (name === 't') {
      if (t !== undefined) return false;
      t = value;
    }
    if (name === 'v1') {
      if (v1 !== undefined) return false;
      v1 = value;
    }
  }

  if (!t || !/^\d+$/.test(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) {
    return false;
  }

  // 2. Protection contre le rejeu : fenêtre de 5 minutes
  const timestamp = Number(t);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > TOLERANCE_MS) {
    return false;
  }

  // 3. HMAC sur `${t}.${rawBody}`, avec le t reçu tel quel
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');

  // 4. Comparaison à temps constant, JAMAIS ===
  const received = Buffer.from(v1, 'utf8');
  const computed = Buffer.from(expected, 'utf8');

  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}
