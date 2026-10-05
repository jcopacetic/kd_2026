// The only server route on the site (Vercel function). Checks the submission for spam,
// then emails it to Jonathan through Google Workspace (Gmail SMTP with an app password).
// Nothing is stored; the email is the record. (A database copy is parked for later.)
//
// Env (Vercel → Settings → Environment Variables), see .env.example:
//   GMAIL_USER            the Workspace mailbox that sends, e.g. you@yourdomain.com
//   GMAIL_APP_PASSWORD    a Google app password for that mailbox (needs 2-Step Verification)
//   FORM_NOTIFY_TO        where notifications go (defaults to GMAIL_USER)
//   TURNSTILE_SECRET_KEY  optional; enables Cloudflare Turnstile verification
//   TURNSTILE_SITE_KEY    public key for the widget (set both or neither)
import type { APIRoute } from 'astro';
import nodemailer, { type Transporter } from 'nodemailer';
import { GMAIL_USER, GMAIL_APP_PASSWORD, FORM_NOTIFY_TO, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { site } from '../../data/site';

export const prerender = false;

const INTENT_LABEL: Record<string, string> = {
  audit: 'Systems Audit request',
  'website-audit': 'Website Audit request',
  contact: 'Contact form',
  local: 'Local (Amarillo/Canyon) inquiry',
};

/** Submissions faster than this after the page rendered are almost always bots. */
const MIN_FILL_MS = 3_000;
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // a form left open for a day is fine; older tokens are stale

const str = (v: FormDataEntryValue | null, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const URL_PATTERN = /https?:\/\/|www\./gi;
// One plain address: no commas, quotes or brackets that could smuggle a second recipient into Reply-To.
const EMAIL_PATTERN = /^[^\s@,;:<>()"\[\]\\]+@[^\s@,;:<>()"\[\]\\]+\.[^\s@,;:<>()"\[\]\\]+$/;
/** The real form is a few KB; anything far bigger isn't a person filling it in. */
const MAX_BODY_BYTES = 64 * 1024;

let transport: Transporter | undefined;
function mailer() {
  transport ??= nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    // Fail fast instead of nodemailer's 2-minute defaults, so a stalled SMTP connection
    // doesn't hold the function (and the visitor) open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

export const POST: APIRoute = async ({ request, clientAddress, redirect, url }) => {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const ok = () => (wantsJson ? Response.json({ ok: true }) : redirect('/contact/thanks/', 303));
  const fail = (error: string, status = 400) =>
    wantsJson ? Response.json({ error }, { status }) : new Response(error, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  // Only accept posts from our own pages (blocks cross-site form posting).
  // "null" (sandboxed frames, some privacy modes) isn't a parseable URL and is rejected too.
  const origin = request.headers.get('origin');
  if (origin && URL.parse(origin)?.host !== url.host) return fail('Invalid origin.', 403);

  const type = request.headers.get('content-type') || '';
  if (!type.startsWith('multipart/form-data') && !type.startsWith('application/x-www-form-urlencoded')) {
    return fail('Invalid submission.', 415);
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return fail('Submission too large.', 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Invalid submission.');
  }

  // Bot traps. Pretend success so bots don't learn what tripped them.
  const dropped = (reason: string) => {
    console.warn(`contact: dropped as spam (${reason})`);
    return ok();
  };
  if (str(form.get('company_url'))) return dropped('honeypot'); // hidden field people never see
  // Set by the page's script when the form renders. Visitors without JavaScript send none,
  // so the timing check only applies when it's present (the honeypot still applies).
  const renderedAt = Number(str(form.get('rendered_at'), 20));
  if (renderedAt) {
    const age = Date.now() - renderedAt;
    if (age < MIN_FILL_MS) return dropped('filled too fast');
    if (age > MAX_AGE_MS) return dropped('stale form');
  }

  const fields = {
    firstname: oneLine(str(form.get('firstname'), 100)),
    lastname: oneLine(str(form.get('lastname'), 100)),
    email: oneLine(str(form.get('email'), 254)),
    company: oneLine(str(form.get('company'), 200)),
    website: oneLine(str(form.get('website'), 300)),
    message: str(form.get('message'), 5000),
    howDidYouHear: oneLine(str(form.get('how_did_you_hear'), 100)),
    pageUri: oneLine(str(form.get('pageUri'), 500)),
  };
  const intent = str(form.get('intent'), 40);
  const label = INTENT_LABEL[intent] ?? INTENT_LABEL.contact;

  if (!fields.firstname || !fields.lastname || !fields.message || !EMAIL_PATTERN.test(fields.email)) {
    return fail('Please fill in your name, a valid email and a message.');
  }
  // Link-stuffed messages are the classic contact-form spam.
  if ((fields.message.match(URL_PATTERN) ?? []).length > 3) return dropped('too many links');

  // Cloudflare Turnstile (on when TURNSTILE_SECRET_KEY is set; the widget needs TURNSTILE_SITE_KEY).
  // Fails closed: if Cloudflare can't be reached, the submission is refused rather than let through.
  const secret = TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = str(form.get('cf-turnstile-response'), 2048);
    if (!token) return fail('Couldn’t confirm you’re not a bot. Please reload the page and try again.');
    const verify: { success?: boolean; 'error-codes'?: string[] } = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: clientAddress }),
      signal: AbortSignal.timeout(5_000),
    })
      .then((r) => r.json())
      .catch(() => ({ success: false, 'error-codes': ['siteverify-unreachable'] }));
    if (!verify.success) {
      console.warn(`contact: turnstile rejected (${(verify['error-codes'] ?? []).join(', ') || 'no reason given'})`);
      return fail('Couldn’t confirm you’re not a bot. Please reload the page and try again.');
    }
  }


  const user = GMAIL_USER;
  if (!user || !GMAIL_APP_PASSWORD) {
    console.error('contact: GMAIL_USER / GMAIL_APP_PASSWORD not set');
    return fail('The form isn’t connected yet.', 503);
  }

  const name = `${fields.firstname} ${fields.lastname}`;
  const rows: [string, string][] = [
    ['Name', name],
    ['Email', fields.email],
    ['Company', fields.company],
    ['Website', fields.website],
    ['Found me via', fields.howDidYouHear],
    ['Sent from', fields.pageUri],
  ].filter(([, v]) => v) as [string, string][];

  const text = `${label}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMessage:\n${fields.message}\n`;
  const html = `<h2 style="font-family:sans-serif">${escapeHtml(label)}</h2>
<table style="font-family:sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#636765">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>
<p style="font-family:sans-serif;color:#636765;margin-top:16px">Message</p>
<p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(fields.message)}</p>
<p style="font-family:sans-serif;color:#636765;font-size:12px">Reply to this email to answer ${escapeHtml(fields.firstname)} directly.</p>`;

  try {
    await mailer().sendMail({
      from: { name: `${site.name} website`, address: user },
      to: FORM_NOTIFY_TO || user,
      replyTo: { name, address: fields.email },
      subject: `${label}: ${name}${fields.company ? ` (${fields.company})` : ''}`,
      text,
      html,
    });
  } catch (err) {
    console.error('contact: sending failed', err);
    return fail('Something went wrong sending your message.', 502);
  }

  return ok();
};
