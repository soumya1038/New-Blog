import React from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 23, 2026';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
    <div className="space-y-3 text-[var(--text-secondary)] leading-7 text-sm sm:text-base">{children}</div>
  </section>
);

const TermsOfService = () => {
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
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">Terms of Service</h1>
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
          style={{
            background: 'var(--surface-card)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Section title="1. Acceptance of Terms">
            <p>By accessing or using Lekhon, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
          </Section>

          <Section title="2. Accounts and Eligibility">
            <p>You are responsible for account accuracy and credential security. Activity under your account is your responsibility unless required otherwise by law.</p>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You must use the service lawfully and must not attempt unauthorized access, abuse features, distribute malicious content, or violate third-party rights.</p>
          </Section>

          <Section title="4. User Content">
            <p>You retain ownership of your content. You grant Lekhon the rights necessary to host, display, and process that content for platform operation.</p>
          </Section>

          <Section title="5. Service Changes and Availability">
            <p>We may modify or discontinue features at any time. We do not guarantee uninterrupted availability or error-free operation.</p>
          </Section>

          <Section title="6. Suspension and Termination">
            <p>Accounts may be suspended or terminated for policy violations, legal risk, security threats, or abuse of platform systems.</p>
          </Section>

          <Section title="7. Disclaimer and Liability">
            <p>The service is provided as is and as available. To the maximum extent permitted by law, we disclaim implied warranties and limit liability for indirect or consequential damages.</p>
          </Section>

          <Section title="8. Policy Updates">
            <p>We may update these terms over time. Continued use after updates means you accept the revised terms.</p>
          </Section>

          <Section title="9. Contact">
            <p>For legal or terms-related inquiries, contact us through the official support/contact channel listed on the application website.</p>
          </Section>
        </main>
      </div>
    </div>
  );
};

export default TermsOfService;
