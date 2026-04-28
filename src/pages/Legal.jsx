import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Cookie, FileText, Mail, ShieldCheck } from 'lucide-react';
import Container from '../components/ui/Container';

const LEGAL_UPDATED = 'April 28, 2026';
const SUPPORT_EMAIL = 'support@ludusgen.com';
const LEGAL_EMAIL = 'legal@ludusgen.com';
const PRIVACY_EMAIL = 'privacy@ludusgen.com';
const OPERATOR = 'the LudusGen project operator';

const legalPages = {
  terms: {
    title: 'Terms of Service',
    eyebrow: 'Basic rules',
    icon: FileText,
    summary: 'A short agreement for using LudusGen during its early public release.',
    sections: [
      {
        title: '1. Early test phase',
        body: [
          'LudusGen is currently an early-stage test project, not a service operated through a registered company. References to "LudusGen", "we", "us", and "our" mean the current project operator unless this page is updated with a different legal operator.',
          'By accessing or using LudusGen, you agree to these Terms. If you do not agree, do not use the service.',
          'During the test phase, features may be incomplete, experimental, changed, paused, or removed at any time. Do not rely on LudusGen for critical production work.',
          `For support, contact ${SUPPORT_EMAIL}. For legal notices, contact ${LEGAL_EMAIL}.`,
        ],
      },
      {
        title: '2. Basic use rules',
        body: [
          'You are responsible for your account, prompts, uploads, generated content, marketplace listings, purchases, and downloads.',
          'Do not use LudusGen to break the law, infringe intellectual property, upload malware, bypass payments or security, harass others, or publish illegal, harmful, non-consensual, or privacy-violating content.',
          'AI outputs can be inaccurate, unexpected, or similar to outputs generated for other users. Review all outputs before publishing, selling, or relying on them.',
        ],
      },
      {
        title: '3. Content, marketplace, and payments',
        body: [
          'You must only upload, generate, publish, or sell content that you have the right to use. Sellers are responsible for the rights, accuracy, and quality of their listings.',
          'Unless a listing says otherwise, a purchased marketplace asset may be used in personal or commercial projects, but it may not be resold, redistributed, sublicensed, or published as a standalone asset.',
          'During the test phase, credits and marketplace purchases may be simulated, limited, or unavailable. Real-money payments are not required unless clearly shown at checkout. If a paid generation or purchase later becomes available and fails, contact support and we will review whether credits, access, or another reasonable remedy should be provided.',
        ],
      },
      {
        title: '4. Service changes and limits',
        body: [
          'LudusGen is provided as is and may change, pause, or remove features while the service is being developed.',
          'We may remove content, restrict listings, suspend accounts, or block access when needed for safety, legal compliance, payment issues, security, or rule violations.',
          'Nothing in these Terms limits rights that cannot legally be limited, including mandatory consumer rights.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Data notice',
    icon: ShieldCheck,
    summary: 'The basic privacy notice for LudusGen accounts, creative tools, marketplace, and support.',
    sections: [
      {
        title: '1. Data controller and contact',
        body: [
          `LudusGen is currently an early-stage test project. For privacy requests, ${OPERATOR} can be contacted at ${PRIVACY_EMAIL}.`,
        ],
      },
      {
        title: '2. What we process',
        body: [
          'We may process account data, authentication data, prompts, uploads, generated outputs, marketplace listings, purchases, credit activity, support messages, reports, device data, IP address, cookies, logs, and diagnostics.',
          'We use this data to provide LudusGen, keep accounts secure, run AI jobs, store and deliver files, operate credits and marketplace purchases, provide support, prevent abuse, comply with law, and improve reliability.',
          'We may use service providers for hosting, authentication, database, storage, AI generation, payments, email, analytics, security, and support. Data may be processed outside your country with appropriate safeguards where required.',
        ],
      },
      {
        title: '3. Your rights',
        body: [
          `Depending on your location, you may ask to access, correct, delete, export, restrict, or object to the use of your personal data by contacting ${PRIVACY_EMAIL}.`,
          'Some data may need to be kept for security, legal, accounting, marketplace access, or dispute reasons.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    eyebrow: 'Storage notice',
    icon: Cookie,
    summary: 'A short notice about cookies, local storage, and similar browser technologies.',
    sections: [
      {
        title: '1. Cookies and local storage',
        body: [
          'LudusGen may use cookies, local storage, session storage, authentication tokens, and similar technologies to keep you signed in, secure accounts, remember settings, operate credits and purchases, measure reliability, and prevent abuse.',
          'You can control cookies in your browser settings. Blocking essential storage may prevent login, account security, generation history, purchases, downloads, or marketplace access from working correctly.',
          `Questions about cookies can be sent to ${PRIVACY_EMAIL}.`,
        ],
      },
    ],
  },
};

const slugAliases = {
  marketplace: 'terms',
  refunds: 'terms',
};

const legalNav = [
  { slug: 'terms', label: 'Terms', icon: FileText },
  { slug: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { slug: 'cookies', label: 'Cookies', icon: Cookie },
];

function Section({ section, index }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.18) }}
      className="border-b border-white/10 py-8 last:border-b-0"
    >
      <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">{section.title}</h2>
      <div className="mt-5 space-y-4">
        {section.body.map((paragraph) => (
          <p key={paragraph} className="text-sm font-semibold leading-7 text-gray-400 md:text-[15px]">
            {paragraph}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

export default function Legal() {
  const { slug = 'terms' } = useParams();
  const normalizedSlug = legalPages[slug] ? slug : slugAliases[slug];
  const page = legalPages[normalizedSlug];

  if (!page) return <Navigate to="/legal/terms" replace />;
  if (slug !== normalizedSlug) return <Navigate to={`/legal/${normalizedSlug}`} replace />;

  const PageIcon = page.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03000a] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-96 bg-[linear-gradient(180deg,rgba(138,43,226,0.16),transparent)]" />
      </div>

      <Container className="relative z-10">
        <div className="pt-32 pb-20 md:pt-40">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-gray-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to LudusGen
          </Link>

          <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:items-start">
            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
                {legalNav.map((item) => {
                  const Icon = item.icon;
                  const active = item.slug === slug;
                  return (
                    <Link
                      key={item.slug}
                      to={`/legal/${item.slug}`}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                        active
                          ? 'bg-primary text-white shadow-[0_0_28px_rgba(138,43,226,0.24)]'
                          : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </aside>

            <article className="min-w-0">
              <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl md:p-8">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                    <PageIcon className="h-4 w-4" />
                    {page.eyebrow}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                    Updated {LEGAL_UPDATED}
                  </span>
                </div>

                <h1 className="max-w-4xl text-4xl font-black italic tracking-tighter text-white md:text-6xl">
                  {page.title}
                </h1>
                <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-gray-400">
                  {page.summary}
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-black/25 px-6 backdrop-blur-xl md:px-9">
                {page.sections.map((section, index) => (
                  <Section key={section.title} section={section} index={index} />
                ))}
              </div>

              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="mt-8 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Legal contact</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">{LEGAL_EMAIL}</p>
                </div>
              </a>
            </article>
          </div>
        </div>
      </Container>
    </main>
  );
}
