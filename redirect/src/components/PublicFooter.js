import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const LOGO_URL =
  'https://res.cloudinary.com/ddpdydsji/image/upload/v1769780228/ChatGPT_Image_Jan_30_2026_03_07_38_AM-photoaidcom-cropped_oq1pfz.png';

const socialLinks = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/lekhonofficial/?viewAsMember=true',
    icon: FaLinkedinIn,
  },
  {
    label: 'X',
    href: 'https://x.com/LekhonOfficial',
    icon: FaXTwitter,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/lekhonofficial/',
    icon: FaFacebookF,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/lekhonofficial/',
    icon: FaInstagram,
  },
];

const legalLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

const PublicFooter = () => {
  return (
    <footer
      className="border-t border-[var(--border-default)] bg-[var(--surface-card)]"
      aria-label="Lekhon public footer"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/home" className="flex items-center gap-3 text-[var(--text-primary)] no-underline">
            <img
              src={LOGO_URL}
              alt="Lekhon"
              className="h-9 w-9 rounded-lg object-cover shadow-sm"
            />
            <div>
              <p className="m-0 text-sm font-extrabold tracking-wide">Lekhon</p>
              <p className="m-0 text-xs text-[var(--text-muted)]">Write. Connect. Inspire.</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Public pages">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-semibold text-[var(--text-secondary)] no-underline transition hover:text-[var(--brand-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3" aria-label="Lekhon social links">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Lekhon on ${item.label}`}
                  title={`Lekhon on ${item.label}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-3 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">&copy; 2026 Lekhon. All rights reserved.</p>
          <p className="m-0">
            Google Sign-In is used for authentication, account creation, and account management.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
