import { redirect } from 'next/navigation';

/** The old Free vs Pro comparison: pricing now lives on the homepage. */
export default function ProPage() {
  redirect('/#tarifs');
}
