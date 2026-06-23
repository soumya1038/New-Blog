import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBars,
  FaCheckCircle,
  FaCommentDots,
  FaFacebookF,
  FaImage,
  FaInstagram,
  FaLinkedinIn,
  FaLock,
  FaMagic,
  FaMoon,
  FaPaperPlane,
  FaPenNib,
  FaShoppingBag,
  FaStore,
  FaSun,
  FaTimes,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';

const featureLinks = [
  { label: 'Write', href: '#feat-write' },
  { label: 'Connect', href: '#feat-connect' },
  { label: 'Chat', href: '#feat-chat' },
  { label: 'Stories', href: '#feat-stories' },
  { label: 'AI Tools', href: '#feat-ai' },
  { label: 'Marketplace', href: '#feat-market' },
  { label: 'Privacy', href: '#feat-privacy' },
];

const features = [
  {
    id: 'feat-write',
    label: 'Write',
    title: 'Write without limits.',
    body: 'A focused editor, drafts, rich formatting, and publishing tools keep the blank page calm from first line to final post.',
    link: '/create',
    linkLabel: 'Open the editor',
    visual: 'editor',
  },
  {
    id: 'feat-connect',
    label: 'Connect',
    title: 'Find your readers. Build your audience.',
    body: 'Follow writers, read what moves you, and grow a community around real posts instead of empty metrics.',
    link: '/home',
    linkLabel: 'Explore the feed',
    visual: 'community',
    flip: true,
  },
  {
    id: 'feat-chat',
    label: 'Chat',
    title: 'Keep the conversation close.',
    body: 'Direct messages, replies, and writing-room energy help ideas continue after someone finishes reading.',
    link: '/chat',
    linkLabel: 'Open community',
    visual: 'chat',
  },
  {
    id: 'feat-stories',
    label: 'Stories',
    title: 'Share what is happening now.',
    body: 'Short updates give readers a small window into the process behind the articles, drafts, and creator life.',
    link: '/shorts',
    linkLabel: 'Watch shorts',
    visual: 'stories',
    flip: true,
  },
  {
    id: 'feat-ai',
    label: 'AI Tools',
    title: 'Create smarter with AI.',
    body: 'Use the assistant to shape article ideas, improve copy, and move faster when a draft needs a little momentum.',
    link: '/create',
    linkLabel: 'Start with AI',
    visual: 'ai',
  },
  {
    id: 'feat-market',
    label: 'Marketplace',
    title: 'Turn creative trust into income.',
    body: 'List creator products beside your writing so readers can discover, buy, and support your work in the same place.',
    link: '/marketplace',
    linkLabel: 'Visit marketplace',
    visual: 'market',
    flip: true,
  },
  {
    id: 'feat-privacy',
    label: 'Privacy',
    title: 'Your writing is yours.',
    body: 'Control visibility, conversations, and account settings with privacy tools that keep ownership clear.',
    link: '/privacy',
    linkLabel: 'Read privacy policy',
    visual: 'privacy',
  },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Write & Publish', to: '/create' },
      { label: 'Feed', to: '/home' },
      { label: 'Shorts', to: '/shorts' },
      { label: 'Marketplace', to: '/marketplace' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'News', to: '/news' },
      { label: 'For Creators', to: '/become-seller' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

const HeroLaptop = () => (
  <div className="lekhon-landing-laptop" aria-label="Lekhon editor preview">
    <div className="lekhon-landing-laptop__screen">
      <div className="lekhon-landing-laptop__bar">
        <span />
        <span />
        <span />
        <strong>lekhon.app/write</strong>
      </div>
      <div className="lekhon-landing-editor-demo">
        <aside>
          <strong>LEKHON</strong>
          <span className="is-active">My Drafts</span>
          <span>Published</span>
          <span>AI Writer</span>
          <span>Messages</span>
          <span>My Store</span>
          <button type="button">New Article</button>
        </aside>
        <main>
          <div className="editor-toolbar">
            <span>B</span>
            <span>I</span>
            <span>H1</span>
            <span>H2</span>
            <span><FaImage /></span>
            <button type="button">Publish</button>
          </div>
          <div className="editor-title-line" />
          <div className="editor-line is-long" />
          <div className="editor-line" />
          <div className="editor-line is-mid" />
          <div className="editor-line is-short" />
          <div className="editor-tags">
            <span>Writing</span>
            <span>Life</span>
            <span>Career</span>
          </div>
        </main>
      </div>
    </div>
    <div className="lekhon-landing-laptop__base" />
  </div>
);

const PhoneShell = ({ type }) => (
  <div className="lekhon-landing-phone" aria-hidden="true">
    <div className={`lekhon-landing-phone__screen is-${type}`}>
      {type === 'editor' && (
        <>
          <div className="phone-header">
            <span className="phone-avatar">L</span>
            <div>
              <strong>Lekhon Editor</strong>
              <small>Draft saved</small>
            </div>
            <button type="button">Publish</button>
          </div>
          <div className="phone-toolbar">
            <span>B</span><span>I</span><span>H1</span><span>H2</span><span><FaImage /></span>
          </div>
          <div className="phone-content">
            <strong>The Art of Slow Writing</strong>
            <i /><i /><i /><i className="short" /><i />
            <div className="phone-note"><FaMagic /> Try opening with a question.</div>
          </div>
        </>
      )}

      {type === 'community' && (
        <>
          <div className="phone-header">
            <div>
              <strong>Community</strong>
              <small>Following 248 writers</small>
            </div>
          </div>
          <div className="phone-feed">
            {['Riya S.', 'Kabir M.', 'Aarav P.'].map((name, index) => (
              <div className="phone-feed-card" key={name}>
                <div><span>{name.charAt(0)}</span><strong>{name}</strong><small>{index + 2}m</small></div>
                <i /><i className="short" />
                <p><FaCommentDots /> {index === 0 ? '38 replies' : 'New comment'}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {type === 'chat' && (
        <>
          <div className="phone-header">
            <span className="phone-avatar">R</span>
            <div>
              <strong>Riya Sharma</strong>
              <small>Online</small>
            </div>
          </div>
          <div className="phone-chat">
            <p className="from-them">Your latest piece stayed with me.</p>
            <p className="from-me">Thank you. It took three drafts.</p>
            <p className="from-them">Let us collaborate on the next one.</p>
            <div className="phone-input">Type a message...</div>
          </div>
        </>
      )}

      {type === 'stories' && (
        <>
          <div className="phone-header">
            <div>
              <strong>Stories</strong>
              <small>5 new updates</small>
            </div>
          </div>
          <div className="story-row">
            {['You', 'Riya', 'Kabir', 'Aarav'].map((name) => <span key={name}>{name}</span>)}
          </div>
          <div className="story-preview">
            <div>
              <strong>Morning writing ritual</strong>
              <i /><i className="short" />
            </div>
          </div>
        </>
      )}

      {type === 'ai' && (
        <>
          <div className="ai-header">
            <strong>LEKHON AI</strong>
            <small>Your creative assistant</small>
          </div>
          <div className="ai-chat">
            <p className="ai">What are you writing today?</p>
            <p className="you">A piece about minimalist writing.</p>
            <p className="ai">Here is a sharper opening...</p>
            <div><FaPaperPlane /> Ask AI anything</div>
          </div>
        </>
      )}

      {type === 'market' && (
        <>
          <div className="phone-header">
            <div>
              <strong>My Store</strong>
              <small>4 products</small>
            </div>
            <button type="button">Add</button>
          </div>
          <div className="market-grid">
            {[
              ['Guidebook', 'Rs 299'],
              ['Design Kit', 'Rs 799'],
              ['Content Kit', 'Rs 149'],
            ].map(([name, price]) => (
              <div key={name}>
                <FaShoppingBag />
                <strong>{name}</strong>
                <small>{price}</small>
              </div>
            ))}
            <div className="new-product">+</div>
          </div>
          <footer><FaStore /> Creator storefront</footer>
        </>
      )}

      {type === 'privacy' && (
        <>
          <div className="phone-header">
            <div>
              <strong>Privacy Settings</strong>
              <small>Your account is secure</small>
            </div>
            <FaLock />
          </div>
          <div className="privacy-list">
            {['Article visibility', 'Comments', 'Direct messages', 'Profile analytics'].map((label, index) => (
              <div key={label}>
                <span>{label}</span>
                <i className={index === 3 ? 'is-off' : ''} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);

const FeatureSection = ({ feature }) => (
  <section className={`lekhon-landing-feature ${feature.flip ? 'is-flipped' : ''}`} id={feature.id}>
    <div className="lekhon-landing-feature__copy" data-landing-reveal>
      <p>{feature.label}</p>
      <h2>{feature.title}</h2>
      <span />
      <p>{feature.body}</p>
      <Link to={feature.link}>
        {feature.linkLabel}
        <FaArrowRight />
      </Link>
    </div>
    <div className="lekhon-landing-feature__visual" data-landing-reveal="delayed">
      <PhoneShell type={feature.visual} />
    </div>
  </section>
);

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const pageRef = useRef(null);

  const handleBrandReload = (event) => {
    event.preventDefault();
    window.location.reload();
  };

  useEffect(() => {
    if (!navOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [navOpen]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const revealElements = Array.from(page.querySelectorAll('[data-landing-reveal]'));
    const showAll = () => revealElements.forEach((element) => element.classList.add('is-visible'));

    if (!('IntersectionObserver' in window)
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      showAll();
      return undefined;
    }

    page.classList.add('is-reveal-ready');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px',
    });

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="lekhon-landing-page" ref={pageRef}>
      <Helmet>
        <title>Lekhon | Write. Connect. Grow.</title>
        <meta
          name="description"
          content="Lekhon is a free blogging and creator platform for writing, community, stories, AI tools, and marketplace discovery."
        />
      </Helmet>

      <header className="lekhon-landing-header">
        <a className="lekhon-landing-brand" href="/" onClick={handleBrandReload}>
          <img src="/image/lekhon_url.png" alt="Lekhon" />
          <span>Lekhon</span>
        </a>

        <button
          type="button"
          className="lekhon-landing-menu"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((current) => !current)}
        >
          {navOpen ? <FaTimes /> : <FaBars />}
        </button>

        <nav className={navOpen ? 'is-open' : ''} aria-label="Landing navigation">
          <div className="landing-feature-menu">
            <a href="#feat-write" onClick={() => setNavOpen(false)}>Features</a>
            <div>
              {featureLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setNavOpen(false)}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <Link to="/marketplace" onClick={() => setNavOpen(false)}>Marketplace</Link>
          <Link to="/about" onClick={() => setNavOpen(false)}>About</Link>
          <Link to="/privacy" onClick={() => setNavOpen(false)}>Privacy</Link>
        </nav>

        <div className="lekhon-landing-actions">
          <button
            type="button"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
          <Link to="/login">Log in</Link>
          <Link className="is-primary" to="/register">Start Writing</Link>
        </div>
      </header>

      <main>
        <section className="lekhon-landing-hero">
          <div className="lekhon-landing-hero__copy">
            <p>Free for everyone</p>
            <h1>Lekhon</h1>
            <h2>Write your story. Build your audience.</h2>
            <p>
              A calm creator platform for beautiful articles, reader communities,
              short updates, AI-assisted drafts, and creator products.
            </p>
            <div>
              <Link className="lekhon-landing-primary" to="/register">
                Start Writing Free
                <FaArrowRight />
              </Link>
              <Link className="lekhon-landing-secondary" to="/home">
                Explore Feed
              </Link>
            </div>
            <small><FaCheckCircle /> Free to start. No credit card required.</small>
          </div>

          <div className="lekhon-landing-hero__visual">
            <HeroLaptop />
          </div>
        </section>

        <section className="lekhon-landing-statement">
          <h2 data-landing-reveal>
            With Lekhon, your words find readers, and the writers who move you
            are always close enough to follow, message, and support.
          </h2>
        </section>

        {features.map((feature) => (
          <FeatureSection key={feature.id} feature={feature} />
        ))}

        <section className="lekhon-landing-proof" aria-label="Lekhon platform highlights">
          <div data-landing-reveal>
            <strong>Free</strong>
            <span>Always to start</span>
          </div>
          <div data-landing-reveal>
            <strong>4</strong>
            <span>Content formats</span>
          </div>
          <div data-landing-reveal>
            <strong>Store</strong>
            <span>Creator products</span>
          </div>
          <div data-landing-reveal>
            <strong>Mobile</strong>
            <span>Ready everywhere</span>
          </div>
        </section>

        <section className="lekhon-landing-cta">
          <h2>Start writing today. It is free.</h2>
          <p>Join Lekhon and publish your first piece from a focused, friendly workspace.</p>
          <Link to="/register">
            Start Writing Free
            <FaArrowRight />
          </Link>
        </section>
      </main>

      <footer className="lekhon-landing-footer">
        <div className="lekhon-landing-footer__brand">
          <img src="/image/lekhon_url.png" alt="Lekhon" />
          <strong>Lekhon</strong>
          <p>A free blogging and creator platform. Write, connect, and grow.</p>
        </div>

        <div className="lekhon-landing-footer__links">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.to} to={link.to}>{link.label}</Link>
              ))}
            </div>
          ))}
        </div>

        <div className="lekhon-landing-footer__bottom">
          <span>2026 Lekhon. All rights reserved.</span>
          <div>
            <a href="https://x.com/LekhonOfficial" aria-label="Lekhon on X"><FaXTwitter /></a>
            <a href="https://www.instagram.com/lekhonofficial/" aria-label="Lekhon on Instagram"><FaInstagram /></a>
            <a href="https://www.facebook.com/lekhonofficial/" aria-label="Lekhon on Facebook"><FaFacebookF /></a>
            <a href="https://www.linkedin.com/company/lekhon/" aria-label="Lekhon on LinkedIn"><FaLinkedinIn /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
