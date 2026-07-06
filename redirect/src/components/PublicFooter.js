import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import './PublicFooter.css';

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

export const footerColumns = [
  {
    title: 'Explore Lekhon',
    links: [
      { label: 'Home', to: '/home' },
      { label: 'About', to: '/about' },
      { label: 'Writing help', to: '/help/category/writing-publishing' },
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Android app', to: '/help/category/android' },
    ],
  },
  {
    title: 'Create and connect',
    links: [
      { label: 'Publishing guides', to: '/help/category/writing-publishing' },
      { label: 'AI tools', to: '/help/category/ai-tools' },
      { label: 'Messages and calls', to: '/help/category/community-messaging' },
      { label: 'Privacy and security', to: '/help/category/privacy-security' },
      { label: 'Safety Center', to: '/safety' },
    ],
  },
  {
    title: 'Buy and sell',
    links: [
      { label: 'Buyer help', to: '/help/category/marketplace-buyers' },
      { label: 'Seller help', to: '/help/category/selling' },
      { label: 'Orders and refunds', to: '/help/article/cancel-order-and-understand-refund' },
      { label: 'Earnings and payouts', to: '/help/article/understand-seller-earnings-and-payouts' },
      { label: 'Marketplace policies', to: '/policies' },
    ],
  },
  {
    title: 'Help and safety',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'Contact support', to: '/contact' },
      { label: 'Report abuse or fraud', to: '/report' },
      { label: 'Submit an appeal', to: '/appeals' },
      { label: 'Account security', to: '/help/category/privacy-security' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Policy directory', to: '/policies' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'AI usage guidance', to: '/help/article/use-ai-tools-responsibly' },
      { label: 'API safety', to: '/help/article/create-and-protect-api-key' },
    ],
  },
];

const PublicFooter = () => {
  return (
    <footer
      className="border-t border-[var(--border-default)] bg-[var(--surface-card)]"
      aria-label="Lekhon public footer"
    >
      <div className="public-footer__inner">
        <div className="public-footer__top">
          <Link to="/home" className="public-footer__brand">
            <img
              src={LOGO_URL}
              alt="Lekhon"
              className="public-footer__logo"
            />
            <div>
              <p className="public-footer__name">Lekhon</p>
              <p className="public-footer__tagline">Write. Connect. Inspire.</p>
            </div>
          </Link>

          <div className="public-footer__socials" aria-label="Lekhon social links">
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
                  className="public-footer__social-link"
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>

        <nav
          className="public-footer__columns public-footer__columns--desktop"
          aria-label="Footer navigation"
        >
          {footerColumns.map((column) => (
            <div key={column.title} className="public-footer__column">
              <h2>{column.title}</h2>
              <div className="public-footer__links">
                {column.links.map((link) => (
                  <Link key={`${column.title}-${link.to}-${link.label}`} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <nav
          className="public-footer__columns public-footer__columns--mobile"
          aria-label="Footer navigation"
        >
          {footerColumns.map((column) => (
            <details key={column.title} className="public-footer__column">
              <summary>{column.title}</summary>
              <div className="public-footer__links">
                {column.links.map((link) => (
                  <Link key={`${column.title}-${link.to}-${link.label}`} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </nav>

        <div className="public-footer__bottom">
          <p>&copy; 2026 Lekhon. All rights reserved.</p>
          <p>
            Published policies apply as shown. Documents marked in review are not final terms.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
