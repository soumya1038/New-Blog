import React from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 23, 2026';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{title}</h2>
    <div className="space-y-3 text-[var(--text-secondary)] leading-7">{children}</div>
  </section>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'var(--background-primary)' }}>
      <div
        className="max-w-4xl mx-auto rounded-2xl p-6 sm:p-10 border"
        style={{
          background: 'var(--surface-card)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="mb-8">
          <Link
            to="/"
            className="font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2 text-[var(--text-primary)]">Terms of Service</h1>
          <p className="text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using Lekhon, you agree to these Terms of Service. If you do not agree, you should not use the service.</p>
        </Section>

        <Section title="2. Eligibility and Accounts">
          <p>You are responsible for providing accurate account information and for safeguarding your account credentials.</p>
          <p>You are responsible for all activity that occurs under your account unless prohibited by law.</p>
        </Section>

        <Section title="3. Permitted Use">
          <p>You agree to use the platform lawfully and respectfully. You must not abuse features, attempt unauthorized access, distribute malware, or violate others&apos; rights.</p>
        </Section>

        <Section title="4. User Content">
          <p>You retain rights to your content, but you grant Lekhon the rights needed to host, display, and process that content to operate the platform.</p>
          <p>You are solely responsible for content you post and must ensure it does not violate law or third-party rights.</p>
        </Section>

        <Section title="5. Prohibited Conduct">
          <p>Prohibited behavior includes harassment, impersonation, fraud, copyright infringement, hate content, unlawful activity, or attempts to disrupt platform stability.</p>
        </Section>

        <Section title="6. Account Suspension or Termination">
          <p>We may suspend, restrict, or terminate access when accounts violate these terms, threaten security, or create legal/platform risk.</p>
        </Section>

        <Section title="7. Service Availability">
          <p>We may update, modify, or discontinue parts of the service at any time. We do not guarantee uninterrupted availability.</p>
        </Section>

        <Section title="8. Disclaimers">
          <p>The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind except where required by law.</p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>To the maximum extent permitted by law, Lekhon and its operators are not liable for indirect, incidental, special, or consequential damages resulting from use of the service.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>We may revise these terms from time to time. Continued use after updates means you accept the revised terms.</p>
        </Section>

        <Section title="11. Contact">
          <p>For legal or terms-related inquiries, please contact us through the platform support/contact channel.</p>
        </Section>
      </div>
    </div>
  );
};

export default TermsOfService;

