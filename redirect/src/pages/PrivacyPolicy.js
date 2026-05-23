import React from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 23, 2026';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
    <div className="space-y-3 text-[var(--text-secondary)] leading-7 text-sm sm:text-base">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12" style={{ background: 'var(--background-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <header
          className="mb-6 sm:mb-8 rounded-2xl border px-5 py-4 sm:px-6 sm:py-5"
          style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/image/lekhon_url.png" alt="Lekhon Logo" className="h-12 w-12 rounded-lg object-cover" />
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Lekhon</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Privacy Policy</h1>
              </div>
            </div>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold border"
              style={{ color: 'var(--brand-primary)', borderColor: 'var(--border-default)' }}
            >
              Back to Home
            </Link>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </header>

        <main
          className="rounded-2xl border p-6 sm:p-8 space-y-8 sm:space-y-10"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}
        >
          <Section title="1. Information We Collect">
            <p>We collect details you provide directly, such as account profile data, published content, and support requests.</p>
            <p>We also collect operational data like device/browser information, basic logs, and security telemetry to keep the platform stable and safe.</p>
          </Section>

          <Section title="2. How We Use Information">
            <p>Information is used to create and maintain your account, provide core features, secure the platform, and improve product quality.</p>
            <p>We also use email for essential service communication, including verification, password recovery, and important account notices.</p>
          </Section>

          <Section title="3. Google Sign-In Data">
            <p>When you use Google Sign-In, we receive account information approved by you, typically your name, email address, and profile picture.</p>
            <p>We use this data only for authentication, account creation/sign-in, and user account management inside Lekhon.</p>
          </Section>

          <Section title="4. Data Sharing">
            <p>We do not sell personal information. We share data only with service providers required to operate the platform, subject to contractual safeguards.</p>
            <p>We may disclose data when legally required or when necessary to protect platform integrity, user safety, or enforce policies.</p>
          </Section>

          <Section title="5. Retention and Security">
            <p>Data is retained only as long as needed for service delivery, security, dispute handling, and legal compliance.</p>
            <p>We use reasonable technical and organizational controls to protect personal data; no internet system can be guaranteed as fully risk-free.</p>
          </Section>

          <Section title="6. Your Choices">
            <p>You can update account information, adjust privacy controls, and request account deletion through available platform settings.</p>
          </Section>

          <Section title="7. Updates to This Policy">
            <p>We may revise this policy periodically. Updates will be reflected on this page by changing the “Last updated” date.</p>
          </Section>

          <Section title="8. Contact">
            <p>For privacy requests or questions, contact us through the official support channel listed on the application website.</p>
          </Section>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

