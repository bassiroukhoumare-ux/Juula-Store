'use client';

// /adminom → Notifications: manual Web Push (broadcast or one merchant).
import React, { useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Loader2,
  Megaphone,
  Monitor,
  Search,
  Send,
  Smartphone,
  User,
  Users,
} from 'lucide-react';
import { Card, ErrorBox, Kpi, Loading, adminFetch, useAdminData, useDebounced } from './ui';
import type { OnChanged } from './Moderation';

interface PushUser {
  id: string;
  email: string;
  name: string | null;
  storeName: string | null;
  logoUrl: string | null;
  devices: number;
}
interface PushInfo {
  configured: boolean;
  stats: { devices: number; users: number; byDevice: Record<string, number> };
  users: PushUser[];
}
interface Report {
  sent: number;
  failed: number;
  removed: number;
}

const URL_PRESETS = [
  { label: 'Tableau de bord', url: '/dashboard' },
  { label: 'Commandes', url: '/dashboard?tab=kanban' },
  { label: 'Portefeuille', url: '/dashboard?tab=wallet' },
  { label: 'Produits', url: '/dashboard?tab=products' },
];

const field =
  'w-full px-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-soft)] text-[15px] focus:outline-none focus:border-[#235BF7]';

export const PushPanel: React.FC<{ tick: number; onChanged: OnChanged }> = ({
  tick,
  onChanged,
}) => {
  const [target, setTarget] = useState<'all' | 'user'>('all');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [picked, setPicked] = useState<PushUser | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/dashboard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [local, setLocal] = useState(0);
  const { data, error: loadError } = useAdminData<PushInfo>(
    `/api/adminom/push?q=${encodeURIComponent(dq)}`,
    tick + local,
  );

  useEffect(() => setReport(null), [target, picked]);

  const recipients = target === 'all' ? (data?.stats.devices ?? 0) : (picked?.devices ?? 0);
  const ready =
    title.trim().length >= 2 &&
    body.trim().length >= 2 &&
    url.startsWith('/') &&
    (target === 'all' || Boolean(picked));

  const send = async () => {
    if (!ready || busy) return;
    if (
      target === 'all' &&
      !window.confirm(`Envoyer cette notification à ${recipients} appareil(s) ?`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const r = await adminFetch<Report>('/api/adminom/push', {
        method: 'POST',
        body: {
          target,
          ...(target === 'user' && picked ? { userId: picked.id } : {}),
          title,
          body,
          url,
        },
      });
      setReport(r);
      setLocal((v) => v + 1);
      onChanged(`Notification envoyée à ${r.sent} appareil${r.sent > 1 ? 's' : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’envoi a échoué.');
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorBox error={loadError} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi
          label="Appareils abonnés"
          value={String(data.stats.devices)}
          hint="téléphones et ordinateurs"
          icon={<BellRing className="w-5 h-5" />}
          tone="bg-violet-500/12 text-violet-500"
        />
        <Kpi
          label="Marchands joignables"
          value={String(data.stats.users)}
          hint="au moins un appareil"
          icon={<Users className="w-5 h-5" />}
          tone="bg-sky-500/12 text-sky-500"
        />
        <Kpi
          label="Mobiles"
          value={String((data.stats.byDevice.android ?? 0) + (data.stats.byDevice.ios ?? 0))}
          hint={`Android ${data.stats.byDevice.android ?? 0} · iPhone ${data.stats.byDevice.ios ?? 0}`}
          icon={<Smartphone className="w-5 h-5" />}
          tone="bg-emerald-500/12 text-emerald-500"
        />
        <Kpi
          label="Ordinateurs"
          value={String(data.stats.byDevice.desktop ?? 0)}
          hint="navigateurs de bureau"
          icon={<Monitor className="w-5 h-5" />}
          tone="bg-orange-500/12 text-orange-500"
        />
      </div>

      {!data.configured && (
        <Card className="!p-4 text-[14px] font-semibold text-amber-600">
          Clés VAPID absentes sur ce serveur : les notifications ne peuvent pas partir.
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="space-y-5">
          <div>
            <h3 className="text-[17px] font-extrabold">Envoyer une notification</h3>
            <p className="text-[13px] text-[var(--a-muted)]">
              Elle s’affiche sur l’écran des marchands, même application fermée.
            </p>
          </div>

          {/* Recipients */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[14px] font-semibold">1. Destinataires</legend>
            <div role="radiogroup" className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
              {(
                [
                  [
                    'all',
                    'Tous les utilisateurs',
                    `${data.stats.devices} appareil(s)`,
                    <Megaphone key="a" className="w-5 h-5" />,
                  ],
                  [
                    'user',
                    'Un utilisateur',
                    'Recherche par e-mail ou boutique',
                    <User key="u" className="w-5 h-5" />,
                  ],
                ] as const
              ).map(([id, label, hint, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={target === id}
                  onClick={() => setTarget(id)}
                  className={`min-h-16 p-3 rounded-2xl border-2 text-left flex items-center gap-3 cursor-pointer ${
                    target === id ? 'border-[#235BF7] bg-[#235BF7]/8' : 'border-[var(--a-border)]'
                  }`}
                >
                  <span className="text-[#235BF7]">{icon}</span>
                  <span>
                    <span className="block text-[14px] font-bold">{label}</span>
                    <span className="block text-[12px] text-[var(--a-muted)]">{hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {target === 'user' && (
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--a-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="E-mail, nom ou boutique"
                    className={`${field} h-12 pl-10`}
                  />
                </div>
                <ul className="max-h-64 overflow-y-auto rounded-2xl border border-[var(--a-border)] divide-y divide-[var(--a-border)]">
                  {data.users.length === 0 && (
                    <li className="px-4 py-3 text-[14px] text-[var(--a-muted)]">
                      {q ? 'Aucun résultat.' : 'Aucun marchand abonné pour le moment.'}
                    </li>
                  )}
                  {data.users.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(u)}
                        aria-pressed={picked?.id === u.id}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer ${
                          picked?.id === u.id ? 'bg-[#235BF7]/8' : 'hover:bg-[var(--a-soft)]'
                        }`}
                      >
                        <span className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-[var(--a-soft)] flex items-center justify-center text-[13px] font-bold text-[var(--a-muted)]">
                          {u.logoUrl ? (
                            <img src={u.logoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (u.storeName ?? u.email).charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold truncate">
                            {u.storeName ?? u.name ?? u.email}
                          </span>
                          <span className="block text-[12px] text-[var(--a-muted)] truncate">
                            {u.email}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[12px] font-bold ${
                            u.devices > 0
                              ? 'bg-emerald-500/12 text-emerald-600'
                              : 'bg-[var(--a-soft)] text-[var(--a-muted)]'
                          }`}
                        >
                          {u.devices > 0
                            ? `${u.devices} appareil${u.devices > 1 ? 's' : ''}`
                            : 'Non abonné'}
                        </span>
                        {picked?.id === u.id && (
                          <CheckCircle2 className="w-5 h-5 text-[#235BF7] shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {picked && picked.devices === 0 && (
                  <p className="text-[13px] font-semibold text-amber-600">
                    Ce marchand n’a activé les notifications sur aucun appareil.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* Content */}
          <div className="space-y-3">
            <p className="text-[14px] font-semibold">2. Message</p>
            <label className="block space-y-1.5">
              <span className="flex justify-between text-[13px] font-semibold">
                Titre de la notification
                <span className="font-normal text-[var(--a-muted)] tabular-nums">
                  {title.length}/120
                </span>
              </span>
              <input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Nouveauté sur Juula 🎉"
                className={`${field} h-12`}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="flex justify-between text-[13px] font-semibold">
                Message
                <span className="font-normal text-[var(--a-muted)] tabular-nums">
                  {body.length}/400
                </span>
              </span>
              <textarea
                value={body}
                maxLength={400}
                rows={3}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex : Les codes promo sont maintenant disponibles dans l’onglet Marketing."
                className={`${field} py-3 resize-y`}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold">Lien d’ouverture (URL relative)</span>
              <input
                value={url}
                maxLength={300}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/dashboard"
                className={`${field} h-12 font-mono text-[14px]`}
              />
              <span className="flex flex-wrap gap-1.5">
                {URL_PRESETS.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setUrl(p.url)}
                    className={`min-h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                      url === p.url
                        ? 'bg-[var(--a-text)] text-[var(--a-bg)]'
                        : 'bg-[var(--a-soft)] text-[var(--a-muted)] hover:text-[var(--a-text)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </span>
              {!url.startsWith('/') && (
                <span className="block text-[12px] font-semibold text-rose-500">
                  Le lien doit commencer par « / » (page de Juula).
                </span>
              )}
            </label>
          </div>

          {error && <p className="text-[14px] font-semibold text-rose-500">{error}</p>}
          {report && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-[14px] space-y-0.5">
              <p className="font-bold text-emerald-600">Envoi terminé</p>
              <p>
                {report.sent} reçu(s) · {report.failed} échec(s) · {report.removed} abonnement(s)
                expiré(s) supprimé(s)
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void send()}
            disabled={!ready || busy || !data.configured}
            className="w-full sm:w-auto min-h-12 px-6 rounded-xl bg-[#235BF7] hover:bg-[#1B4AD6] disabled:opacity-45 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer la notification
            {recipients > 0 && ` (${recipients} appareil${recipients > 1 ? 's' : ''})`}
          </button>
        </Card>

        {/* Live preview */}
        <Card className="space-y-3 lg:self-start">
          <p className="text-[14px] font-bold">Aperçu</p>
          <div className="rounded-[28px] p-4 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
            <div className="rounded-2xl bg-white/90 backdrop-blur p-3 flex gap-3 shadow-lg">
              <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-[#64748B]">JUULA</p>
                  <p className="text-[11px] text-[#94A3B8]">maintenant</p>
                </div>
                <p className="text-[14px] font-bold text-[#0F172A] break-words">
                  {title || 'Titre de la notification'}
                </p>
                <p className="text-[13px] text-[#334155] break-words line-clamp-4">
                  {body || 'Votre message apparaîtra ici.'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-[var(--a-muted)]">
            Au toucher, ouvre <span className="font-mono">{url || '/dashboard'}</span>.
          </p>
        </Card>
      </div>
    </div>
  );
};
