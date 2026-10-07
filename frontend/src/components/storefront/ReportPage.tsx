'use client';

// Full page « Signaler cette boutique / ce produit ».
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  ImagePlus,
  Loader2,
  Lock,
  Package,
  Send,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import {
  REPORT_MAX_DESCRIPTION,
  REPORT_MAX_IMAGES,
  REPORT_REASONS,
  type ReportReason,
} from '@/lib/store/reports';

export interface ReportPageTarget {
  shop: string | null;
  productSlug: string | null;
  storeName: string;
  logoUrl: string | null;
  accent: string | null;
  productTitle: string | null;
  productImage: string | null;
}

interface Photo {
  id: string;
  file: File;
  preview: string;
}

/** Shrinks a photo (max 1600 px, JPEG) so 5 proofs fit in one request. */
async function compress(file: File): Promise<File> {
  if (file.size < 350_000 && file.type !== 'image/png') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const encode = async (max: number, quality: number) => {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const c2d = canvas.getContext('2d');
      if (!c2d) return null;
      c2d.fillStyle = '#fff';
      c2d.fillRect(0, 0, canvas.width, canvas.height);
      c2d.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    };
    let blob = await encode(1600, 0.82);
    if (blob && blob.size > 900_000) blob = await encode(1280, 0.7);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-[#E3E7EE] bg-white text-[16px] text-[#201D1D] placeholder:text-[#9AA0AB] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] transition';

const Field: React.FC<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, htmlFor, children, hint }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-[#201D1D]">
      {label}
    </label>
    {children}
    {hint && <p className="text-[12px] text-[#7A808C]">{hint}</p>}
  </div>
);

export const ReportPage: React.FC<{ target: ReportPageTarget; backHref: string }> = ({
  target,
  backHref,
}) => {
  const accent = target.accent || '#235BF7';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const addFiles = async (list: FileList | File[]) => {
    setError(null);
    const room = REPORT_MAX_IMAGES - photos.length;
    const picked = Array.from(list).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (picked.length < Array.from(list).length) {
      setError('Seules les photos JPG, PNG ou WebP sont acceptées.');
    }
    if (picked.length > room) setError(`${REPORT_MAX_IMAGES} photos maximum.`);
    const next: Photo[] = [];
    for (const f of picked.slice(0, Math.max(0, room))) {
      const file = await compress(f);
      next.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setPhotos((p) => [...p, ...next].slice(0, REPORT_MAX_IMAGES));
  };
  const removePhoto = (id: string) =>
    setPhotos((list) => {
      const p = list.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.preview);
      return list.filter((x) => x.id !== id);
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!reason) {
      setError('Choisissez le motif du signalement.');
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (target.shop) fd.set('shop', target.shop);
    if (target.productSlug) fd.set('produit', target.productSlug);
    fd.set('firstName', firstName);
    fd.set('lastName', lastName);
    fd.set('email', email);
    fd.set('phone', phone);
    fd.set('reason', reason);
    fd.set('description', description);
    fd.set('pageUrl', (document.referrer || window.location.href).slice(0, 500));
    fd.set('website', honeypot.current?.value ?? '');
    for (const p of photos) fd.append('photos', p.file);
    try {
      const res = await fetch('/api/public/reports', { method: 'POST', body: fd });
      const body = (await res.json().catch(() => null)) as {
        caseRef?: string;
        message?: string;
      } | null;
      if (!res.ok) throw new Error(body?.message ?? 'L’envoi a échoué. Réessayez.');
      setDone(body?.caseRef ?? '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’envoi a échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const style = {
    '--accent': accent,
    '--accent-soft': `color-mix(in srgb, ${accent} 16%, transparent)`,
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-[#F6F7F9] text-[#201D1D]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#ECEFF4]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <a
            href={backHref}
            aria-label="Retour"
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-[#3F4654] hover:bg-[#F1F3F6]"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          {target.logoUrl ? (
            <img src={target.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold">
              {target.storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="min-w-0 truncate text-[16px] font-bold">{target.storeName}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {done !== null ? (
          <section className="rounded-[28px] bg-white border border-[#ECEFF4] p-6 sm:p-10 text-center">
            <span className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </span>
            <h1 className="mt-5 text-[24px] sm:text-[28px] font-extrabold tracking-tight">
              Signalement envoyé
            </h1>
            <p className="mt-3 max-w-lg mx-auto text-[16px] text-[#3F4654] leading-relaxed">
              Votre signalement a été transmis à l’équipe de sécurité Juula Store. Un accusé de
              réception a été envoyé à votre adresse e-mail.
            </p>
            {done && (
              <p className="mt-4 inline-flex px-4 py-2 rounded-full bg-[#F1F3F6] text-[14px] font-semibold">
                Dossier n° {done}
              </p>
            )}
            <div className="mt-8">
              <a
                href={backHref}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-[var(--accent)] text-white text-[15px] font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </a>
            </div>
          </section>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="w-12 h-12 shrink-0 rounded-2xl bg-[#FEF3F2] text-[#D92D20] flex items-center justify-center">
                <Flag className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight leading-tight">
                  {target.productTitle ? 'Signaler ce produit' : 'Signaler cette boutique'}
                </h1>
                <p className="mt-1 text-[15px] text-[#7A808C]">
                  Un problème avec une commande ou un vendeur ? L’équipe sécurité de Juula Store
                  examine chaque signalement.
                </p>
              </div>
            </div>

            {/* Reported target */}
            <div className="mt-6 flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#ECEFF4]">
              <span className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-[#F1F3F6] flex items-center justify-center text-[#9AA0AB]">
                {target.productImage ? (
                  <img src={target.productImage} alt="" className="w-full h-full object-cover" />
                ) : target.productTitle ? (
                  <Package className="w-6 h-6" />
                ) : (
                  <Store className="w-6 h-6" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9AA0AB]">
                  {target.productTitle ? 'Produit signalé' : 'Boutique signalée'}
                </p>
                <p className="text-[16px] font-bold truncate">
                  {target.productTitle ?? target.storeName}
                </p>
                {target.productTitle && (
                  <p className="text-[13px] text-[#7A808C] truncate">
                    Vendu par {target.storeName}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5" noValidate={false}>
              <input
                ref={honeypot}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] w-px h-px opacity-0"
              />

              <section className="rounded-[24px] bg-white border border-[#ECEFF4] p-5 sm:p-6 space-y-4">
                <h2 className="text-[17px] font-extrabold">1. Vos coordonnées</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" htmlFor="r-first">
                    <input
                      id="r-first"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      maxLength={80}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Nom" htmlFor="r-last">
                    <input
                      id="r-last"
                      required
                      autoComplete="family-name"
                      value={lastName}
                      maxLength={80}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="Adresse e-mail"
                    htmlFor="r-email"
                    hint="La réponse de l’équipe de modération arrivera ici."
                  >
                    <input
                      id="r-email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      maxLength={200}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="Numéro WhatsApp / Téléphone"
                    htmlFor="r-phone"
                    hint="Avec l’indicatif du pays, ex. +221."
                  >
                    <input
                      id="r-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      maxLength={22}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-[24px] bg-white border border-[#ECEFF4] p-5 sm:p-6 space-y-4">
                <h2 className="text-[17px] font-extrabold">2. Le problème</h2>
                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-[14px] font-semibold">Motif du signalement</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-center gap-3 min-h-12 px-4 py-2.5 rounded-xl border-2 text-[15px] cursor-pointer transition-colors ${
                          reason === r.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold'
                            : 'border-[#E3E7EE] bg-white hover:bg-[#F6F7F9]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.id}
                          checked={reason === r.id}
                          onChange={() => setReason(r.id)}
                          className="w-4 h-4 accent-[var(--accent)]"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Description détaillée" htmlFor="r-desc">
                  <textarea
                    id="r-desc"
                    required
                    minLength={10}
                    maxLength={REPORT_MAX_DESCRIPTION}
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Expliquez ce qui s’est passé : date de la commande, montant payé, échanges avec le vendeur…"
                    className={`${inputCls} h-auto py-3 resize-y`}
                  />
                  <p className="text-right text-[12px] text-[#9AA0AB] tabular-nums">
                    {description.length} / {REPORT_MAX_DESCRIPTION}
                  </p>
                </Field>
              </section>

              <section className="rounded-[24px] bg-white border border-[#ECEFF4] p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-[17px] font-extrabold">
                    3. Preuves <span className="font-medium text-[#7A808C]">(facultatif)</span>
                  </h2>
                  <p className="text-[14px] text-[#7A808C]">
                    Jusqu’à {REPORT_MAX_IMAGES} photos : preuve de paiement, captures WhatsApp,
                    photo du colis…
                  </p>
                </div>
                {photos.length < REPORT_MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      void addFiles(e.dataTransfer.files);
                    }}
                    className={`w-full min-h-32 px-4 py-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors ${
                      dragging
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[#D5DAE2] hover:bg-[#F6F7F9]'
                    }`}
                  >
                    <ImagePlus className="w-7 h-7 text-[var(--accent)]" />
                    <span className="text-[15px] font-semibold">Ajouter des photos</span>
                    <span className="text-[13px] text-[#7A808C]">
                      Glissez-déposez ou touchez pour choisir · JPG, PNG, WebP ·{' '}
                      {REPORT_MAX_IMAGES - photos.length} restante
                      {REPORT_MAX_IMAGES - photos.length > 1 ? 's' : ''}
                    </span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                {photos.length > 0 && (
                  <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {photos.map((p, i) => (
                      <li
                        key={p.id}
                        className="relative aspect-square rounded-xl overflow-hidden bg-[#F1F3F6]"
                      >
                        <img
                          src={p.preview}
                          alt={`Preuve ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          aria-label={`Retirer la photo ${i + 1}`}
                          className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="flex items-start gap-2 text-[13px] text-[#7A808C]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                Vos coordonnées restent confidentielles : elles sont transmises uniquement à
                l’équipe de sécurité Juula Store, jamais au vendeur.
              </p>

              {error && (
                <p
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[14px] font-semibold"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-14 rounded-full bg-[var(--accent)] text-white text-[16px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-[0_14px_30px_-14px_var(--accent)]"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Envoyer le signalement
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#9AA0AB]">
                <ShieldCheck className="w-4 h-4" /> Équipe sécurité Juula Store
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
};
