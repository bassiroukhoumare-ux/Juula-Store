// Text helpers for e-mails received on a report (pure, unit-tested).

/** Very small HTML → text (used when the e-mail has no text part). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const QUOTE_HEADERS = [
  /^\s*le .{4,200}a écrit\s*:?\s*$/i, // Gmail / Apple Mail (fr)
  /^\s*on .{4,200}wrote\s*:?\s*$/i, // en
  /^\s*-{2,}\s*(original message|message d’origine|message d'origine|message original)\s*-{2,}/i,
  /^\s*(de|from)\s*:\s.+$/i, // Outlook header block
  /^\s*_{10,}\s*$/, // Outlook separator
  /^\s*envoyé de mon (iphone|ipad|android|téléphone)/i,
  /^\s*sent from my /i,
];

/** Keeps only what the person wrote: drops the quoted history and signatures. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Gmail sometimes wraps « Le …, X <a@b> a écrit : » over two lines.
    const joined = `${line} ${lines[i + 1] ?? ''}`;
    if (
      QUOTE_HEADERS.some((re) => re.test(line)) ||
      /^\s*le .{4,200}a écrit\s*:?\s*$/i.test(joined)
    ) {
      break;
    }
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  const body = out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return body || text.trim();
}

/** « Fatou <fatou@x.com> » → fatou@x.com */
export function emailOf(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1]! : from).trim().toLowerCase();
}
