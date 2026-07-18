import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  FaArrowRight,
  FaBars,
  FaBookOpen,
  FaCheckCircle,
  FaCommentDots,
  FaFacebookF,
  FaFileAlt,
  FaImage,
  FaInstagram,
  FaLayerGroup,
  FaLinkedinIn,
  FaLock,
  FaMagic,
  FaMoon,
  FaPaperPlane,
  FaStore,
  FaSun,
  FaTelegramPlane,
  FaTimes,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const statementText = 'With Lekhon, your words find readers, and the writers who move you are always close enough to follow, message, and support.';
const statementWords = statementText.split(' ');

const landingMotionRevealSelectors = [
  '.lekhon-landing-header',
  '.lekhon-landing-hero__eyebrow',
  '.lekhon-landing-hero__brand',
  '.lekhon-landing-hero__title',
  '.lekhon-landing-hero__body',
  '.lekhon-landing-hero__actions',
  '.lekhon-landing-hero__disclaimer',
  '.lekhon-landing-laptop-entrance',
  '.lekhon-landing-statement__word',
  '.lekhon-landing-feature__copy > p:first-child',
  '.lekhon-landing-feature__copy h2',
  '.lekhon-landing-feature__copy > span',
  '.lekhon-landing-feature__copy > p:nth-of-type(2)',
  '.lekhon-landing-feature__copy a',
  '.lekhon-landing-phone-entrance',
  '.phone-header',
  '.phone-toolbar',
  '.phone-content',
  '.phone-feed-card',
  '.phone-chat > p',
  '.phone-input',
  '.story-row > span',
  '.story-preview',
  '.ai-header',
  '.ai-chat > p',
  '.ai-chat > div',
  '.market-grid > div',
  '.is-market > footer',
  '.privacy-list > div',
  '.lekhon-landing-feature__number',
  '.lekhon-landing-proof strong',
  '.lekhon-landing-proof span',
  '.lekhon-landing-cta h2',
  '.lekhon-landing-cta p',
  '.lekhon-landing-cta a',
  '.lekhon-landing-footer__brand',
  '.lekhon-landing-footer__links > div',
];

const showLandingMotionFallback = (page, { ambientMotion = true } = {}) => {
  page.querySelectorAll(landingMotionRevealSelectors.join(',')).forEach((element) => {
    element.style.opacity = '1';
    element.style.transform = 'none';
  });

  page.querySelectorAll('.lekhon-landing-feature__copy > p:first-child').forEach((label) => {
    label.classList.add('is-line-in');
  });

  if (!ambientMotion) return;

  page.querySelectorAll('.lekhon-landing-laptop-entrance').forEach((laptop) => {
    laptop.classList.add('is-floating');
  });
  page.querySelectorAll('.lekhon-landing-phone').forEach((phone) => {
    phone.classList.add('is-floating');
  });
};

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
    title: 'Explore',
    links: [
      { label: 'Home', to: '/home' },
      { label: 'About', to: '/about' },
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Android Help', to: '/help/category/android' },
    ],
  },
  {
    title: 'Create',
    links: [
      { label: 'Writing Help', to: '/help/category/writing-publishing' },
      { label: 'AI Tools', to: '/help/category/ai-tools' },
      { label: 'Messages & Calls', to: '/help/category/community-messaging' },
      { label: 'Seller Help', to: '/help/category/selling' },
    ],
  },
  {
    title: 'Buy & Sell',
    links: [
      { label: 'Buyer Help', to: '/help/category/marketplace-buyers' },
      { label: 'Orders & Refunds', to: '/help/article/cancel-order-and-understand-refund' },
      { label: 'Earnings & Payouts', to: '/help/article/understand-seller-earnings-and-payouts' },
      { label: 'Marketplace Policies', to: '/policies' },
    ],
  },
  {
    title: 'Help & Safety',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'Contact Support', to: '/contact' },
      { label: 'Report Abuse', to: '/report' },
      { label: 'Submit an Appeal', to: '/appeals' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Policy Directory', to: '/policies' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'AI Usage', to: '/policies/ai-usage' },
    ],
  },
];

const HeroLaptop = () => (
  <div className="lekhon-landing-laptop-entrance">
    <div className="lekhon-landing-laptop-tilt">
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
    </div>
  </div>
);

const PhoneShell = ({ type }) => (
  <div className="lekhon-landing-phone-entrance" aria-hidden="true">
    <div className="lekhon-landing-phone">
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
              { name: 'Guidebook', price: 'Rs 299', icon: FaBookOpen },
              { name: 'Design Kit', price: 'Rs 799', icon: FaLayerGroup },
              { name: 'Content Kit', price: 'Rs 149', icon: FaFileAlt },
            ].map(({ name, price, icon: ProductIcon }) => (
              <div key={name}>
                <ProductIcon />
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
  </div>
);

const FeatureSection = ({ feature, index }) => (
  <section
    className={`lekhon-landing-feature ${feature.flip ? 'is-flipped' : ''}`}
    id={feature.id}
  >
    <span className="lekhon-landing-feature__number" aria-hidden="true">
      {String(index + 1).padStart(2, '0')}
    </span>
    <div className="lekhon-landing-feature__copy">
      <p>{feature.label}</p>
      <h2>{feature.title}</h2>
      <span />
      <p>{feature.body}</p>
      <Link to={feature.link}>
        {feature.linkLabel}
        <FaArrowRight />
      </Link>
    </div>
    <div className="lekhon-landing-feature__visual">
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

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      page.classList.add('is-motion-reduced');
      showLandingMotionFallback(page, { ambientMotion: false });
      return () => page.classList.remove('is-motion-reduced');
    }

    page.classList.add('is-motion-ready');

    let animationContext;
    try {
      animationContext = gsap.context(() => {
      const header = page.querySelector('.lekhon-landing-header');
      const laptopEntrance = page.querySelector('.lekhon-landing-laptop-entrance');

      gsap.fromTo(header, {
        y: -68,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.65,
        delay: 0.05,
        ease: 'power2.out',
      });

      ScrollTrigger.create({
        start: 'top -1',
        end: 'max',
        onUpdate: () => header.classList.toggle('is-scrolled', window.scrollY > 1),
      });

      const heroItems = [
        '.lekhon-landing-hero__eyebrow',
        '.lekhon-landing-hero__brand',
        '.lekhon-landing-hero__title',
        '.lekhon-landing-hero__body',
        '.lekhon-landing-hero__actions',
        '.lekhon-landing-hero__disclaimer',
      ];

      gsap.set(heroItems, { opacity: 0, y: 30 });
      gsap.set(laptopEntrance, { opacity: 0, y: 60 });

      gsap.timeline({ delay: 0.1, defaults: { ease: 'power3.out' } })
        .to(heroItems[0], { opacity: 1, y: 0, duration: 0.7 })
        .to(heroItems[1], { opacity: 1, y: 0, duration: 0.82 }, '-=0.42')
        .to(heroItems[2], { opacity: 1, y: 0, duration: 0.9 }, '-=0.56')
        .to(heroItems[3], { opacity: 1, y: 0, duration: 0.8 }, '-=0.55')
        .to(heroItems[4], { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
        .to(heroItems[5], { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
        .to(laptopEntrance, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: 'power2.out',
          onComplete: () => laptopEntrance.classList.add('is-floating'),
        }, '-=0.72');

      const statement = page.querySelector('.lekhon-landing-statement');
      const statementHeading = statement.querySelector('h2');
      const statementWords = statement.querySelectorAll('.lekhon-landing-statement__word');

      gsap.set(statementHeading, { opacity: 1 });
      gsap.set(statementWords, { opacity: 0, y: 30 });
      gsap.to(statementWords, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.04,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: statement,
          start: 'top 72%',
          toggleActions: 'play none none reverse',
        },
      });
      gsap.to(statementHeading, {
        scale: 1.02,
        ease: 'none',
        scrollTrigger: {
          trigger: statement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });

      page.querySelectorAll('.lekhon-landing-feature').forEach((section) => {
        const isFlipped = section.classList.contains('is-flipped');
        const copy = section.querySelector('.lekhon-landing-feature__copy');
        const label = copy.querySelector('p:first-child');
        const heading = copy.querySelector('h2');
        const rule = copy.querySelector(':scope > span');
        const body = copy.querySelector('p:nth-of-type(2)');
        const link = copy.querySelector('a');
        const phoneEntrance = section.querySelector('.lekhon-landing-phone-entrance');
        const phone = section.querySelector('.lekhon-landing-phone');
        const number = section.querySelector('.lekhon-landing-feature__number');
        const phoneChildren = phone.querySelectorAll([
          '.phone-header',
          '.phone-toolbar',
          '.phone-content',
          '.phone-feed-card',
          '.phone-chat > p',
          '.phone-input',
          '.story-row > span',
          '.story-preview',
          '.ai-header',
          '.ai-chat > p',
          '.ai-chat > div',
          '.market-grid > div',
          '.is-market > footer',
          '.privacy-list > div',
        ].join(','));

        gsap.set([label, heading, rule, body, link], { opacity: 0, y: 40 });
        gsap.set(phoneEntrance, {
          opacity: 0,
          x: isFlipped ? -50 : 50,
          y: 60,
          rotate: isFlipped ? -4 : 4,
        });
        gsap.set(phoneChildren, { opacity: 0, y: 12 });
        gsap.set(number, { opacity: 0, scale: 0.85 });

        const featureTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 68%',
            toggleActions: 'play none none reverse',
          },
          onReverseComplete: () => {
            label.classList.remove('is-line-in');
          },
        });

        featureTimeline
          .to(label, {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            onStart: () => label.classList.add('is-line-in'),
          })
          .to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.3')
          .to(rule, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.45')
          .to(body, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }, '-=0.4')
          .to(link, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
          .to(phoneEntrance, {
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            duration: 1.2,
            ease: 'power3.out',
            onComplete: () => phone.classList.add('is-floating'),
          }, '-=0.58')
          .to(phoneChildren, {
            opacity: 1,
            y: 0,
            duration: 0.72,
            stagger: 0.12,
            ease: 'power2.out',
          }, '-=0.42')
          .to(number, {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power2.out',
          }, 0.05);

        gsap.to(phoneEntrance, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.4,
          },
        });

        gsap.to(copy, {
          yPercent: -4,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });

      const proof = page.querySelector('.lekhon-landing-proof');
      const proofItems = proof.querySelectorAll(':scope > div');
      const proofNumbers = proof.querySelectorAll('strong');
      const proofLabels = proof.querySelectorAll('span');
      gsap.set([...proofNumbers, ...proofLabels], { opacity: 0, y: 24 });

      ScrollTrigger.create({
        trigger: proof,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to(proofNumbers, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'back.out(1.4)',
          });
          gsap.to(proofLabels, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.12,
            delay: 0.2,
            ease: 'power2.out',
          });

          proofItems.forEach((item) => {
            const number = item.querySelector('[data-count-end]');
            if (!number) return;
            const endValue = Number(number.dataset.countEnd);
            const counter = { value: 0 };
            gsap.to(counter, {
              value: endValue,
              duration: 1.8,
              ease: 'power2.out',
              onUpdate: () => {
                number.textContent = Math.round(counter.value);
              },
            });
          });
        },
      });

      const cta = page.querySelector('.lekhon-landing-cta');
      const ctaItems = cta.querySelectorAll('h2, p, a');
      gsap.set(ctaItems, { opacity: 0, y: 20 });
      gsap.timeline({
        scrollTrigger: {
          trigger: cta,
          start: 'top 78%',
          once: true,
        },
      })
        .to(ctaItems[0], { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
        .to(ctaItems[1], { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.55')
        .to(ctaItems[2], { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.42');

      const footer = page.querySelector('.lekhon-landing-footer');
      const footerBrand = footer.querySelector('.lekhon-landing-footer__brand');
      const footerColumns = footer.querySelectorAll('.lekhon-landing-footer__links > div');
      gsap.set([footerBrand, ...footerColumns], { opacity: 0, y: 24 });
      gsap.timeline({
        scrollTrigger: {
          trigger: footer,
          start: 'top 88%',
          once: true,
        },
      })
        .to(footerBrand, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
        .to(footerColumns, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: 'power2.out',
        }, '-=0.5');

      ScrollTrigger.refresh();
    }, page);
    } catch (error) {
      console.warn('Landing animation setup failed; showing static content.', error);
      page.classList.add('is-motion-fallback');
      showLandingMotionFallback(page);
      return () => {
        page.classList.remove('is-motion-ready', 'is-motion-fallback');
      };
    }

    let isAnimationActive = true;
    const refreshScrollTriggers = () => {
      if (!isAnimationActive) return;
      ScrollTrigger.refresh();
    };
    const scheduleScrollRefresh = () => {
      if (!isAnimationActive) return;
      window.requestAnimationFrame(refreshScrollTriggers);
    };
    const refreshTimer = window.setTimeout(refreshScrollTriggers, 700);

    document.fonts?.ready?.then(scheduleScrollRefresh).catch(() => {});
    window.addEventListener('load', scheduleScrollRefresh, { once: true });

    const pendingImages = Array.from(page.querySelectorAll('img')).filter((image) => !image.complete);
    pendingImages.forEach((image) => {
      image.addEventListener('load', scheduleScrollRefresh, { once: true });
      image.addEventListener('error', scheduleScrollRefresh, { once: true });
    });

    const laptopTilt = page.querySelector('.lekhon-landing-laptop-tilt');
    const handlePointerMove = (event) => {
      if (!laptopTilt || window.matchMedia('(pointer: coarse)').matches) return;
      const xRatio = (event.clientX / window.innerWidth) * 2 - 1;
      const yRatio = (event.clientY / window.innerHeight) * 2 - 1;
      gsap.to(laptopTilt, {
        rotateX: 3 + yRatio * 6,
        rotateY: -6 - xRatio * 9,
        duration: 0.7,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      isAnimationActive = false;
      window.clearTimeout(refreshTimer);
      window.removeEventListener('load', scheduleScrollRefresh);
      pendingImages.forEach((image) => {
        image.removeEventListener('load', scheduleScrollRefresh);
        image.removeEventListener('error', scheduleScrollRefresh);
      });
      window.removeEventListener('pointermove', handlePointerMove);
      animationContext.revert();
      page.classList.remove('is-motion-ready');
    };
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
          <Link to="/help" onClick={() => setNavOpen(false)}>Help</Link>
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
            <p className="lekhon-landing-hero__eyebrow">Free for everyone</p>
            <h1 className="lekhon-landing-hero__brand">Lekhon</h1>
            <h2 className="lekhon-landing-hero__title">Write your story. Build your audience.</h2>
            <p className="lekhon-landing-hero__body">
              A calm creator platform for beautiful articles, reader communities,
              short updates, AI-assisted drafts, and creator products.
            </p>
            <div className="lekhon-landing-hero__actions">
              <Link className="lekhon-landing-primary" to="/register">
                Start Writing Free
                <FaArrowRight />
              </Link>
              <Link className="lekhon-landing-secondary" to="/home">
                Explore Feed
              </Link>
            </div>
            <small className="lekhon-landing-hero__disclaimer">
              <FaCheckCircle /> Free to start. No credit card required.
            </small>
          </div>

          <div className="lekhon-landing-hero__visual">
            <HeroLaptop />
          </div>
        </section>

        <section className="lekhon-landing-statement">
          <h2 aria-label={statementText}>
            {statementWords.map((word, index) => (
              <React.Fragment key={`${word}-${index}`}>
                <span className="lekhon-landing-statement__word" aria-hidden="true">{word}</span>
                {index < statementWords.length - 1 ? ' ' : null}
              </React.Fragment>
            ))}
          </h2>
        </section>

        {features.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        <section className="lekhon-landing-proof" aria-label="Lekhon platform highlights">
          <div>
            <strong>Free</strong>
            <span>Always to start</span>
          </div>
          <div>
            <strong data-count-end="4">4</strong>
            <span>Content formats</span>
          </div>
          <div>
            <strong>Store</strong>
            <span>Creator products</span>
          </div>
          <div>
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
            <a href="https://t.me/LekhonOfficial" aria-label="Lekhon on Telegram"><FaTelegramPlane /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
