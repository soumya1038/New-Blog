import React from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 23, 2026';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{title}</h2>
    <div className="space-y-3 text-[var(--text-secondary)] leading-7">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold mt-4 mb-2 text-[var(--text-primary)]">Privacy Policy</h1>
          <p className="text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Information We Collect">
          <p>We collect information you provide directly, such as username, email address, profile details, and content you create on Lekhon.</p>
          <p>We also collect technical data like device, browser type, and basic usage events to maintain performance, security, and reliability.</p>
        </Section>

        <Section title="2. How We Use Information">
          <p>Your information is used to create and manage your account, provide platform features, improve user experience, and protect the service from abuse.</p>
          <p>We may also use account email for transactional notices such as verification, password reset, and security-related updates.</p>
        </Section>

        <Section title="3. User Content and Visibility">
          <p>Content you publish may be visible to other users based on your selected privacy settings and platform behavior.</p>
          <p>You are responsible for information you choose to share publicly through posts, profiles, or social features.</p>
        </Section>

        <Section title="4. Cookies and Similar Technologies">
          <p>We may use cookies or local storage to keep sessions active, remember preferences, and support essential platform functionality.</p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell your personal data. We may share data with trusted infrastructure/service providers only as needed to operate the application.</p>
          <p>We may disclose information when required by law, legal process, or to protect rights, safety, and platform integrity.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain data as long as necessary to provide services, maintain security, resolve disputes, and comply with legal obligations.</p>
          <p>When accounts or content are deleted, some data may remain temporarily in backups or logs for operational reasons.</p>
        </Section>

        <Section title="7. Security">
          <p>We apply reasonable technical and organizational measures to protect your information. However, no system can be guaranteed fully secure.</p>
        </Section>

        <Section title="8. Your Choices">
          <p>You can update profile details, adjust privacy settings, or request account deletion from available account controls.</p>
        </Section>

        <Section title="9. Children&apos;s Privacy">
          <p>Lekhon is not intended for children under applicable minimum age requirements. If you believe a child provided personal data, contact us for removal review.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Material changes will be reflected by updating the &quot;Last updated&quot; date above.</p>
        </Section>

        <Section title="11. Contact">
          <p>For privacy-related questions, please contact us through the platform support/contact channel.</p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

