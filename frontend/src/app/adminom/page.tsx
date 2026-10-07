// /adminom — Juula platform back-office. Locked behind the master access
// code (see lib/server/adminom/session.ts); never indexed.
import type { Metadata } from 'next';
import { displayFont } from '@/app/fonts';
import { hasAdminSession } from '@/lib/server/adminom/session';
import { AdminLogin } from '@/components/adminom/AdminLogin';
import { AdminApp } from '@/components/adminom/AdminApp';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Juula Admin',
  robots: { index: false, follow: false },
};

export default async function AdminomPage() {
  const signedIn = await hasAdminSession();
  return <div className={displayFont.className}>{signedIn ? <AdminApp /> : <AdminLogin />}</div>;
}
