import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBars,
  FaBookOpen,
  FaCheckCircle,
  FaCommentDots,
  FaEdit,
  FaEye,
  FaHeart,
  FaMoon,
  FaPauseCircle,
  FaPenNib,
  FaPlay,
  FaPlayCircle,
  FaRegBookmark,
  FaSave,
  FaSearch,
  FaShareAlt,
  FaShoppingBag,
  FaShoppingCart,
  FaStore,
  FaSun,
  FaTimes,
  FaTrash,
  FaUsers,
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const asset = (name) => `/3d-landing/assets/${name}`;
const LANDING_STYLES_VERSION = '2026-06-07-staged-orbit-merge';

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const mix = (from, to, amount) => from + (to - from) * amount;
const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const getInitialMotionPreference = () => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage?.getItem('lekhon-landing-reduced-motion');
    if (saved) return saved === 'true';
  } catch (error) {
    // Storage can be unavailable in embedded browsers.
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
};

const heroCards = [
  {
    key: 'article',
    className: 'article-card',
    format: 'Article',
    tagClass: 'gold',
    image: asset('article-thumb.webp'),
    alt: 'Writer on a mountain ridge',
    title: 'The Journey Beyond the Horizon',
    author: 'Arvind Narayan',
    stat: '128',
    meta: '8 min read',
    x: -252,
    y: -142,
    z: 62,
    rotate: -10,
    speed: -36,
  },
  {
    key: 'blog',
    className: 'blog-card',
    format: 'Blog',
    tagClass: 'olive',
    image: asset('blog-thumb.webp'),
    alt: 'Notebook, pen, plant, and coffee on a desk',
    title: 'Building Habits That Last',
    author: 'Meera Iyer',
    stat: '96',
    meta: '5 min read',
    x: 296,
    y: -156,
    z: 42,
    rotate: 8,
    speed: 26,
  },
  {
    key: 'short',
    className: 'short-card',
    format: 'Short',
    tagClass: 'clay',
    image: asset('short-thumb.webp'),
    alt: 'Creator silhouette at sunset',
    title: 'Moments That Stay Forever',
    stat: '1.2K views',
    meta: '42 sec',
    x: -244,
    y: 132,
    z: 88,
    rotate: -8,
    speed: 42,
  },
  {
    key: 'marketplace',
    className: 'product-card',
    format: 'Marketplace',
    tagClass: 'olive',
    image: asset('marketplace-thumb.webp'),
    alt: 'Leather journal and fountain pen',
    title: 'Leather Journal Classic Series',
    price: 'Rs 899',
    meta: 'Creator product',
    x: 336,
    y: 96,
    z: 78,
    rotate: 9,
    speed: -18,
  },
];

const communityCard = {
  key: 'community',
  format: 'Community',
  tagClass: 'olive',
  title: 'The Evening Writers Room',
  x: 248,
  y: 262,
  z: 104,
  rotate: 7,
  speed: 34,
  messages: [
    { author: 'Riya Sharma', text: 'Loved your latest piece!', time: '2m' },
    { author: 'Kabir Verma', text: 'Let us collaborate on something new.', time: '15m' },
  ],
};

const orbitCards = [...heroCards, communityCard];
const ORBIT_MERGE_ANCHOR_KEY = 'article';
const orbitMergeSequence = ['blog', 'marketplace', 'community', 'short'];
const ORBIT_FINAL_DISPLAY_KEY = orbitMergeSequence[orbitMergeSequence.length - 1];
const ORBIT_RETURN_ARC_CARD_KEY = 'short';
const ORBIT_MERGE_DESTINATION = { x: -244, y: 132, z: 154 };
const ORBIT_MERGE_MARK_START = 0.58;
const ORBIT_MERGE_MARK_GAP = 0.105;
const ORBIT_MERGE_MARK_SPAN = 0.08;
const ORBIT_MERGE_APPROACH_SPAN = 0.07;
const ORBIT_MERGE_CONTENT_REVEAL_SPAN = 0.035;
const ORBIT_MERGE_CARD_FADE_SPAN = 0.026;
const getOrbitMergeMark = (index) => ORBIT_MERGE_MARK_START + index * ORBIT_MERGE_MARK_GAP;
const orbitCardMap = orbitCards.reduce((acc, card) => {
  acc[card.key] = card;
  return acc;
}, {});

const featureSteps = [
  {
    key: 'publish',
    cardKey: 'article',
    number: '01',
    title: 'Article publishing feels like a calm writing desk',
    route: '/create',
    cta: 'Start Writing',
    layout: 'demo-left',
    demo: 'publish',
    copy:
      'The first demo shows a draft becoming a published article with autosave, focused editing, and a clear publish action.',
    leftNotes: ['Draft title and body stay readable', 'Autosave confirms progress', 'Publish moves the piece into the feed'],
    rightNotes: ['Write with structure', 'Review before publish', 'Return to edit whenever needed'],
  },
  {
    key: 'engagement',
    cardKey: 'article',
    number: '02',
    title: 'Readers can react without breaking the reading flow',
    route: '/home',
    cta: 'Explore Feed',
    layout: 'demo-center',
    demo: 'engagement',
    copy:
      'Likes, comments, saves, and shares are shown as small moments around the content, so the creator sees the audience forming.',
    leftNotes: ['Like count rises immediately', 'Comments slide in context', 'Saved pieces stay easy to return to'],
    rightNotes: ['Share keeps discovery moving', 'Reader actions stay lightweight', 'The content remains the center'],
  },
  {
    key: 'control',
    cardKey: 'blog',
    number: '03',
    title: 'Creators keep control after publishing',
    route: '/home',
    cta: 'Review Posts',
    layout: 'demo-right',
    demo: 'control',
    copy:
      'The edit and delete sequence explains how creators can repair a typo, update a post, or remove content with confirmation.',
    leftNotes: ['Edit opens the post safely', 'Save records the update', 'Delete asks before removing anything'],
    rightNotes: ['Creator ownership is visible', 'Risky actions get confirmation', 'Published work remains manageable'],
  },
  {
    key: 'shorts',
    cardKey: 'short',
    number: '04',
    title: 'Shorts create quick momentum between long reads',
    route: '/shorts',
    cta: 'Watch Shorts',
    layout: 'demo-left',
    demo: 'shorts',
    copy:
      'A vertical short plays as a compact story moment, with progress, hearts, and quick context for fast discovery.',
    leftNotes: ['Progress gives a video-like feel', 'Reactions stay thumb-friendly', 'Short ideas can lead back to deeper writing'],
    rightNotes: ['Fast discovery', 'Visual energy', 'Lightweight publishing'],
  },
  {
    key: 'marketplace',
    cardKey: 'marketplace',
    number: '05',
    title: 'Marketplace turns creator trust into commerce',
    route: '/marketplace',
    cta: 'Visit Marketplace',
    layout: 'demo-center',
    demo: 'marketplace',
    copy:
      'The product demo connects a creator-made item with a quick add-to-cart moment and seller signal.',
    leftNotes: ['Product card stays editorial', 'Price and rating are visible', 'Cart action is direct'],
    rightNotes: ['Creator shops feel native', 'Readers become buyers', 'Products sit beside stories'],
  },
  {
    key: 'community',
    cardKey: 'community',
    number: '06',
    title: 'Community brings the story back into conversation',
    route: '/chat',
    cta: 'Open Community',
    layout: 'demo-right',
    demo: 'community',
    copy:
      'The community demo shows replies, group context, and collaboration energy after a piece has been published.',
    leftNotes: ['Groups create continuity', 'Replies stay close to creators', 'Collaboration becomes natural'],
    rightNotes: ['Discuss', 'Invite', 'Return with a better draft'],
  },
];

const scrollFilmSteps = [
  {
    key: 'intro',
    kind: 'intro',
    title: 'Write, sell, and discover stories in motion',
    cardKey: 'article',
  },
  ...featureSteps.map((step) => ({ ...step, kind: 'feature' })),
  {
    key: 'stats',
    kind: 'stats',
    title: 'A living creative network in one orbit',
    cardKey: 'marketplace',
  },
  {
    key: 'welcome',
    kind: 'welcome',
    title: 'Welcome to Lekhon',
    cardKey: 'community',
  },
];

const stats = [
  { value: '2.4K', label: 'fresh drafts' },
  { value: '314', label: 'creator products' },
  { value: '9.8K', label: 'community replies' },
  { value: '42K', label: 'reader actions' },
];

const navLinks = [
  { label: 'Articles', to: '/home' },
  { label: 'Blogs', to: '/home' },
  { label: 'Shorts', to: '/shorts' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Community', to: '/chat' },
];

const DemoMockup = ({ type }) => {
  if (type === 'publish') {
    return (
      <div className="demo-ui publish-demo" aria-label="Article publishing demo">
        <div className="demo-topbar">
          <span />
          <strong>New Article</strong>
          <em>Autosaved</em>
        </div>
        <div className="editor-title">The Journey Beyond the Horizon</div>
        <div className="editor-line long" />
        <div className="editor-line" />
        <div className="editor-line short" />
        <div className="editor-toolbar">
          <span>B</span>
          <span>I</span>
          <span><FaRegBookmark /></span>
          <button type="button"><FaPenNib /> Publish</button>
        </div>
        <div className="publish-toast"><FaCheckCircle /> Article published</div>
      </div>
    );
  }

  if (type === 'engagement') {
    return (
      <div className="demo-ui engagement-demo" aria-label="Like and comment demo">
        <div className="reader-card">
          <strong>The Journey Beyond the Horizon</strong>
          <p>A quiet paragraph settles into the feed while readers react around it.</p>
          <div className="reader-actions">
            <span className="is-hot"><FaHeart /> 129</span>
            <span><FaCommentDots /> 18</span>
            <span><FaShareAlt /> Share</span>
          </div>
        </div>
        <div className="comment-bubble one">Beautiful ending.</div>
        <div className="comment-bubble two">Saved this for later.</div>
        <div className="floating-heart"><FaHeart /></div>
      </div>
    );
  }

  if (type === 'control') {
    return (
      <div className="demo-ui control-demo" aria-label="Edit and delete demo">
        <div className="control-row is-editing">
          <span><FaEdit /></span>
          <div>
            <strong>Edit post</strong>
            <small>Update title, tags, or body copy</small>
          </div>
          <button type="button"><FaSave /> Save</button>
        </div>
        <div className="control-row is-delete">
          <span><FaTrash /></span>
          <div>
            <strong>Delete draft</strong>
            <small>Confirmation protects the creator</small>
          </div>
          <button type="button">Confirm</button>
        </div>
        <div className="control-confirm"><FaCheckCircle /> Changes saved</div>
      </div>
    );
  }

  if (type === 'shorts') {
    return (
      <div className="demo-ui shorts-demo" aria-label="Shorts playback demo">
        <div className="shorts-frame">
          <img src={asset('short-thumb.webp')} alt="" />
          <div className="shorts-progress"><span /></div>
          <button type="button" aria-label="Play short"><FaPlay /></button>
          <div className="shorts-actions">
            <span><FaHeart /></span>
            <span><FaCommentDots /></span>
            <span><FaShareAlt /></span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'marketplace') {
    return (
      <div className="demo-ui marketplace-demo" aria-label="Marketplace product demo">
        <div className="shop-card">
          <img src={asset('marketplace-thumb.webp')} alt="" />
          <div>
            <small>Creator Drop</small>
            <strong>Leather Journal Classic Series</strong>
            <p>Rs 899 - 4.8 rating</p>
          </div>
        </div>
        <div className="cart-motion">
          <span><FaShoppingCart /></span>
          <strong>Added to cart</strong>
        </div>
        <div className="seller-signal"><FaStore /> Lekhon Studio</div>
      </div>
    );
  }

  return (
    <div className="demo-ui community-demo" aria-label="Community chat demo">
      <div className="group-header"><FaUsers /> Evening Writers Room</div>
      <div className="message-row left">Loved your latest piece!</div>
      <div className="message-row right">Let us collaborate on a follow-up.</div>
      <div className="message-row left">I marked three lines for feedback.</div>
      <div className="typing-row"><span /><span /><span /></div>
    </div>
  );
};

const MergeCardContent = ({ contentCard }) => (
  <>
    <div className={`card-media stable-merge-media ${contentCard.image ? '' : 'is-chat-preview'}`}>
      {contentCard.image ? (
        <img src={contentCard.image} alt={contentCard.alt} />
      ) : (
        <div className="merge-chat-preview" aria-hidden="true">
          {(contentCard.messages || []).map((message) => (
            <span key={`${contentCard.key}-${message.author}-${message.time}`}>
              <strong>{message.author.split(' ')[0]}</strong>
              {message.text}
            </span>
          ))}
        </div>
      )}
      <span className={`card-tag ${contentCard.tagClass}`}>{contentCard.key === 'community' ? 'Chat' : contentCard.format}</span>
      {contentCard.key === 'short' && (
        <span className="play-button" aria-hidden="true"><FaPlay /></span>
      )}
    </div>
    <div className="card-body stable-merge-body">
      <h2>{contentCard.title}</h2>
      <div className="card-meta">
        {contentCard.price ? (
          <>
            <strong>{contentCard.price}</strong>
            <span><FaShoppingCart /></span>
          </>
        ) : contentCard.key === 'community' ? (
          <>
            <span><img src="/image/guest_image.png" alt="" /> {contentCard.messages[0].author}</span>
            <span><FaCommentDots /></span>
          </>
        ) : contentCard.key === 'short' ? (
          <>
            <span><FaEye /> {contentCard.stat}</span>
            <span><FaHeart /></span>
          </>
        ) : (
          <>
            <span><img src="/image/guest_image.png" alt="" /> {contentCard.author}</span>
            <span><FaHeart /> {contentCard.stat}</span>
          </>
        )}
      </div>
    </div>
  </>
);

const OrbitCard = ({
  card,
  displayCard,
  previousDisplayCard,
  incomingDisplayCard,
  mergeTransitionStyle,
  mergeTransitionActive = false,
  active,
  style,
  onSelect,
  mergeAnchor = false,
  mergeState = '',
}) => {
  const visibleCard = displayCard || card;
  const previousMergeCard = previousDisplayCard || visibleCard;
  const incomingMergeCard = incomingDisplayCard || visibleCard;
  const handleSelect = () => onSelect(visibleCard.key);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };

  if (mergeAnchor) {
    return (
      <article
        className={`orbit-card content-card merge-anchor-card ${mergeTransitionActive ? 'is-content-transitioning' : ''} ${active ? 'is-active' : ''} ${mergeState}`}
        data-card={card.key}
        data-visible-card={visibleCard.key}
        data-incoming-card={incomingMergeCard.key}
        data-merge-state={mergeState}
        style={{ ...(style || {}), ...(mergeTransitionStyle || {}) }}
        tabIndex={0}
        role="button"
        aria-label={`Focus ${visibleCard.format} card`}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <div className="merge-content-stack">
          <div className="merge-content-layer is-previous" aria-hidden={mergeTransitionActive ? true : undefined}>
            <MergeCardContent contentCard={previousMergeCard} />
          </div>
          <div className="merge-content-layer is-incoming" aria-hidden={mergeTransitionActive ? undefined : true}>
            <MergeCardContent contentCard={incomingMergeCard} />
          </div>
        </div>
      </article>
    );
  }

  if (visibleCard.key === 'community') {
    return (
      <article
        className={`orbit-card chat-card ${mergeAnchor ? 'merge-anchor-card' : ''} ${active ? 'is-active' : ''} ${mergeState}`}
        data-card={card.key}
        data-visible-card={visibleCard.key}
        data-merge-state={mergeState}
        style={style}
        tabIndex={0}
        role="button"
        aria-label="Focus community card"
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <span className="card-tag olive">Chat</span>
        {visibleCard.messages.map((message) => (
          <div className="chat-row" key={`${message.author}-${message.time}`}>
            <img src="/image/guest_image.png" alt="" />
            <div>
              <strong>{message.author}</strong>
              <p>{message.text}</p>
            </div>
            <span>{message.time}</span>
          </div>
        ))}
      </article>
    );
  }

  return (
    <article
      className={`orbit-card content-card ${visibleCard.className} ${mergeAnchor ? 'merge-anchor-card' : ''} ${active ? 'is-active' : ''} ${mergeState}`}
      data-card={card.key}
      data-visible-card={visibleCard.key}
      data-merge-state={mergeState}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`Focus ${visibleCard.format} card`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="card-media">
        <img src={visibleCard.image} alt={visibleCard.alt} />
        <span className={`card-tag ${visibleCard.tagClass}`}>{visibleCard.format}</span>
        {visibleCard.key === 'short' && (
          <span className="play-button" aria-hidden="true"><FaPlay /></span>
        )}
      </div>
      <div className="card-body">
        <h2>{visibleCard.title}</h2>
        <div className="card-meta">
          {visibleCard.price ? (
            <>
              <strong>{visibleCard.price}</strong>
              <span><FaShoppingCart /></span>
            </>
          ) : visibleCard.key === 'short' ? (
            <>
              <span><FaEye /> {visibleCard.stat}</span>
              <span><FaHeart /></span>
            </>
          ) : (
            <>
              <span><img src="/image/guest_image.png" alt="" /> {visibleCard.author}</span>
              <span><FaHeart /> {visibleCard.stat}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

const FeatureScene = ({ step, progress }) => {
  const flipOut = clamp((progress - 0.6) / 0.4);
  const enter = clamp(progress / 0.28);
  const style = {
    '--scene-progress': progress.toFixed(3),
    '--flip-out': flipOut.toFixed(3),
    '--scene-enter': enter.toFixed(3),
  };

  const primaryPanel = (
    <aside className="feature-panel primary-panel">
      <span>{step.number}</span>
      <h2>{step.title}</h2>
      <p>{step.copy}</p>
      <Link to={step.route}>
        {step.cta}
        <FaArrowRight />
      </Link>
    </aside>
  );

  const notePanel = (items, side) => (
    <aside className={`feature-panel note-panel ${side}`}>
      {items.map((item) => (
        <p key={item}><FaCheckCircle /> {item}</p>
      ))}
    </aside>
  );

  return (
    <section className={`feature-scene ${step.layout}`} style={style} aria-labelledby={`feature-${step.key}`}>
      {step.layout === 'demo-right' && primaryPanel}
      {step.layout === 'demo-center' && notePanel(step.leftNotes, 'left-notes')}
      <div className="demo-card-shell">
        <div className="demo-card-core">
          <div className="demo-card-label">
            <span>{step.number}</span>
            <strong id={`feature-${step.key}`}>{step.title}</strong>
          </div>
          <DemoMockup type={step.demo} />
        </div>
      </div>
      {step.layout === 'demo-left' && primaryPanel}
      {step.layout === 'demo-center' && (
        <aside className="feature-panel primary-panel center-copy">
          <span>{step.number}</span>
          <h2>{step.title}</h2>
          <p>{step.copy}</p>
          <Link to={step.route}>
            {step.cta}
            <FaArrowRight />
          </Link>
        </aside>
      )}
      {step.layout === 'demo-center' && notePanel(step.rightNotes, 'right-notes')}
    </section>
  );
};

const StatsScene = () => (
  <section className="stats-scene" aria-labelledby="stats-title">
    <div>
      <h2 id="stats-title">A living creative network in one orbit</h2>
      <p>
        Articles, shorts, products, and conversations keep feeding one another,
        so every creator action has somewhere useful to go next.
      </p>
    </div>
    <div className="cinematic-stats">
      {stats.map((stat) => (
        <div className="cinematic-stat" key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  </section>
);

const WelcomeScene = () => (
  <section className="welcome-scene" aria-labelledby="welcome-title">
    <div className="welcome-copy">
      <h2 id="welcome-title">Welcome to Lekhon</h2>
      <p>
        Start with a blank page, explore the feed, join a room, or discover a
        creator product. The whole platform is now one cinematic doorway.
      </p>
      <div className="welcome-actions">
        <Link className="primary-button" to="/create"><FaPenNib /> Start Writing</Link>
        <Link className="secondary-button" to="/home"><FaBookOpen /> Explore Feed</Link>
      </div>
    </div>
    <footer className="landing-footer">
      <Link to="/terms">Terms</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/marketplace">Marketplace</Link>
      <Link to="/chat">Community</Link>
      <span>Lekhon - write, sell, and discover stories in motion.</span>
    </footer>
  </section>
);

const MobileChapter = ({ step }) => (
  <article className="mobile-chapter-card">
    <div className="mobile-demo-frame">
      <DemoMockup type={step.demo} />
    </div>
    <span>{step.number}</span>
    <h3>{step.title}</h3>
    <p>{step.copy}</p>
    <Link to={step.route}>
      {step.cta}
      <FaArrowRight />
    </Link>
  </article>
);

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [motionReduced, setMotionReduced] = useState(getInitialMotionPreference);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [filmState, setFilmState] = useState({ progress: 0, activeIndex: 0, localProgress: 0 });
  const [focusedCard, setFocusedCard] = useState('article');
  const filmRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);

  const activeStep = scrollFilmSteps[filmState.activeIndex] || scrollFilmSteps[0];
  const activeFeature = activeStep.kind === 'feature' ? activeStep : featureSteps[0];
  const activeCardKey = activeStep.cardKey || focusedCard;
  const introProgress = motionReduced ? 1 : activeStep.kind === 'intro' ? ease(filmState.localProgress) : 1;
  const orbitMergeProgress = clamp((introProgress - 0.06) / 0.9);
  const settledMergeIndex = orbitMergeSequence.reduce(
    (latest, _, index) => (orbitMergeProgress >= getOrbitMergeMark(index) ? index : latest),
    -1
  );
  const activeMergePulse = Math.max(
    0,
    ...orbitMergeSequence.map((_, index) => {
      const markProgress = clamp((orbitMergeProgress - getOrbitMergeMark(index)) / ORBIT_MERGE_MARK_SPAN);
      return Math.sin(markProgress * Math.PI);
    })
  );
  const mergedDisplayCard =
    settledMergeIndex >= 0 ? orbitCardMap[orbitMergeSequence[settledMergeIndex]] : orbitCardMap[ORBIT_MERGE_ANCHOR_KEY];
  const activeMergeTransitionIndex = orbitMergeSequence.reduce((currentIndex, _, index) => {
    const mergeMark = getOrbitMergeMark(index);
    const transitionStarted = orbitMergeProgress >= mergeMark - ORBIT_MERGE_APPROACH_SPAN;
    const transitionFinished = orbitMergeProgress >= mergeMark + ORBIT_MERGE_CONTENT_REVEAL_SPAN;
    return transitionStarted && !transitionFinished ? index : currentIndex;
  }, -1);
  const activeMergeTransitionMark =
    activeMergeTransitionIndex >= 0 ? getOrbitMergeMark(activeMergeTransitionIndex) : 0;
  const previousMergeDisplayCard =
    activeMergeTransitionIndex >= 0
      ? activeMergeTransitionIndex === 0
        ? orbitCardMap[ORBIT_MERGE_ANCHOR_KEY]
        : orbitCardMap[orbitMergeSequence[activeMergeTransitionIndex - 1]]
      : mergedDisplayCard;
  const incomingMergeDisplayCard =
    activeMergeTransitionIndex >= 0 ? orbitCardMap[orbitMergeSequence[activeMergeTransitionIndex]] : mergedDisplayCard;
  const previousMergeHideProgress =
    activeMergeTransitionIndex >= 0
      ? ease(clamp((orbitMergeProgress - (activeMergeTransitionMark - ORBIT_MERGE_APPROACH_SPAN)) / ORBIT_MERGE_APPROACH_SPAN))
      : 0;
  const incomingMergeRevealProgress =
    activeMergeTransitionIndex >= 0
      ? ease(clamp((orbitMergeProgress - activeMergeTransitionMark) / ORBIT_MERGE_CONTENT_REVEAL_SPAN))
      : 0;
  const mergeContentTransitionStyle = {
    '--previous-hide': previousMergeHideProgress.toFixed(3),
    '--previous-clip': `${(previousMergeHideProgress * 88).toFixed(1)}%`,
    '--previous-opacity': (1 - previousMergeHideProgress * 0.78).toFixed(3),
    '--previous-shift': `${(-previousMergeHideProgress * 10).toFixed(1)}px`,
    '--previous-scale': (1 - previousMergeHideProgress * 0.025).toFixed(3),
    '--incoming-reveal': incomingMergeRevealProgress.toFixed(3),
    '--incoming-clip': `${((1 - incomingMergeRevealProgress) * 100).toFixed(1)}%`,
    '--incoming-shift': `${((1 - incomingMergeRevealProgress) * 14).toFixed(1)}px`,
    '--incoming-scale': (0.982 + incomingMergeRevealProgress * 0.018).toFixed(3),
  };

  useEffect(() => {
    const links = [
      {
        id: 'lekhon-landing-fonts',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&family=Source+Serif+4:wght@400;600;700&display=swap',
      },
      {
        id: 'lekhon-landing-styles',
        href: `/3d-landing/styles.css?v=${LANDING_STYLES_VERSION}`,
      },
    ];

    const createdLinks = links
      .map(({ id, href }) => {
        const existing = document.getElementById(id);
        if (existing) {
          if (existing.getAttribute('href') !== href) {
            existing.setAttribute('href', href);
          }
          return null;
        }

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        return link;
      })
      .filter(Boolean);

    return () => {
      createdLinks.forEach((link) => link.remove());
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Lekhon | Write, sell, and discover stories in motion';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage?.setItem('lekhon-landing-reduced-motion', String(motionReduced));
    } catch (error) {
      // Storage can be unavailable in embedded browsers.
    }
  }, [motionReduced]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    return () => document.body.classList.remove('nav-open');
  }, [navOpen]);

  useEffect(() => {
    if (motionReduced) {
      setFilmState({ progress: 0, activeIndex: 0, localProgress: 0 });
      return undefined;
    }

    const updateFilm = () => {
      const film = filmRef.current;
      if (!film) return;

      const scrollRange = Math.max(film.offsetHeight - window.innerHeight, 1);
      const progress = clamp((window.scrollY - film.offsetTop) / scrollRange);
      const segment = progress * scrollFilmSteps.length;
      const activeIndex = Math.min(Math.floor(segment), scrollFilmSteps.length - 1);
      const localProgress = clamp(segment - activeIndex);

      setFilmState((current) => {
        if (
          current.activeIndex === activeIndex &&
          Math.abs(current.progress - progress) < 0.002 &&
          Math.abs(current.localProgress - localProgress) < 0.002
        ) {
          return current;
        }

        return { progress, activeIndex, localProgress };
      });
    };

    const handleScroll = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateFilm);
    };

    updateFilm();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [motionReduced]);

  useEffect(() => {
    if (activeCardKey) setFocusedCard(activeCardKey);
  }, [activeCardKey]);

  const handlePointerMove = (event) => {
    if (motionReduced) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    document.documentElement.style.setProperty('--pointer-x', clamp(x * 2, -1, 1).toFixed(3));
    document.documentElement.style.setProperty('--pointer-y', clamp(y * 2, -1, 1).toFixed(3));
  };

  const resetPointer = () => {
    document.documentElement.style.setProperty('--pointer-x', '0');
    document.documentElement.style.setProperty('--pointer-y', '0');
  };

  const getOrbitStyle = (card, index) => {
    const spread = typeof window !== 'undefined' && window.innerWidth <= 1440 ? 0.82 : 1;
    const anchorCard = orbitCardMap[ORBIT_MERGE_ANCHOR_KEY];
    const initialX = card.x * spread;
    const initialY = card.y;
    const anchorStartX = anchorCard.x * spread;
    const anchorStartY = anchorCard.y;
    const anchorX = ORBIT_MERGE_DESTINATION.x * spread;
    const anchorY = ORBIT_MERGE_DESTINATION.y;
    const anchorZ = ORBIT_MERGE_DESTINATION.z;
    const sequenceIndex = orbitMergeSequence.indexOf(card.key);

    let x = initialX;
    let y = initialY;
    let z = card.z;
    let rotateY = card.rotate;
    let rotateX = 8;
    let rotateZ = card.rotate / 4;
    let scale = 1;
    let opacity = activeStep.kind === 'intro' ? 1 : index > 2 ? 0.72 : 0.92;
    let zIndex = 20 - index;

    if (card.key === ORBIT_MERGE_ANCHOR_KEY) {
      const anchorSettle = ease(clamp(orbitMergeProgress / 0.3));
      x = mix(anchorStartX, anchorX, anchorSettle);
      y = mix(anchorStartY, anchorY, anchorSettle);
      z = mix(card.z, anchorZ, anchorSettle);
      rotateY = mix(card.rotate, -6, anchorSettle);
      rotateX = mix(8, 3, anchorSettle);
      rotateZ = mix(card.rotate / 4, -2, anchorSettle);
      scale = 1;
      opacity = 1;
      zIndex = 45;
    } else if (sequenceIndex >= 0) {
      const orbitTravel = ease(orbitMergeProgress);
      const startRadius = Math.hypot(initialX, initialY);
      const startAngle = Math.atan2(initialY, initialX);
      const mergeMark = getOrbitMergeMark(sequenceIndex);
      const isReturnArc = card.key === ORBIT_RETURN_ARC_CARD_KEY;
      const orbitBulge = isReturnArc ? 78 : 34 + sequenceIndex * 8;
      const radius = startRadius + Math.sin(orbitTravel * Math.PI) * orbitBulge;
      const angle = startAngle - Math.PI * 2 * orbitTravel;
      let orbitX = Math.cos(angle) * radius;
      let orbitY = Math.sin(angle) * radius;
      const landLead = isReturnArc ? 0.05 : 0.055;
      const landSpan = isReturnArc ? 0.06 : 0.065;
      const land = ease((orbitMergeProgress - (mergeMark - landLead)) / landSpan);
      const landArc = Math.sin(land * Math.PI);
      const mergeWindowStart = mergeMark - ORBIT_MERGE_APPROACH_SPAN;
      const waitingForTurn = orbitMergeProgress < mergeWindowStart;
      const awayX = orbitX - anchorX;
      const awayY = orbitY - anchorY;
      const awayDistance = Math.max(Math.hypot(awayX, awayY), 1);
      const minimumAnchorDistance = 286;
      const avoidDistance = waitingForTurn ? Math.max(minimumAnchorDistance - awayDistance, 0) : 0;
      orbitX += (awayX / awayDistance) * avoidDistance;
      orbitY += (awayY / awayDistance) * avoidDistance;
      const fade = ease((orbitMergeProgress - (mergeMark - 0.004)) / ORBIT_MERGE_CARD_FADE_SPAN);

      x = mix(orbitX, anchorX, land) + landArc * (sequenceIndex % 2 === 0 ? -20 : 18);
      y = mix(orbitY, anchorY, land) - landArc * (isReturnArc ? 20 : 28);
      z = mix(card.z + 78 + sequenceIndex * 14, 150 - sequenceIndex * 5, land);
      rotateY = mix(card.rotate, -6, land);
      rotateX = mix(10, 3, land);
      rotateZ = mix(card.rotate / 4, -2, land);
      scale = mix(1, 0.96, land);
      opacity = mix(1, 0.02, fade);
      zIndex = land > 0.02 ? 42 - sequenceIndex : 30 - sequenceIndex;
    }

    return {
      transform: [
        'translate(-50%, -50%)',
        `translate3d(${x}px, ${y}px, ${z}px)`,
        `rotateY(${rotateY}deg)`,
        `rotateX(${rotateX}deg)`,
        `rotateZ(${rotateZ}deg)`,
        `scale(${scale})`,
      ].join(' '),
      opacity,
      zIndex,
      pointerEvents: opacity < 0.08 ? 'none' : 'auto',
    };
  };

  const getMergeState = (cardKey) => {
    if (cardKey === ORBIT_MERGE_ANCHOR_KEY) {
      return activeMergePulse > 0.04 ? 'is-receiving' : '';
    }

    const sequenceIndex = orbitMergeSequence.indexOf(cardKey);
    if (sequenceIndex < 0) return '';
    const mergeMark = getOrbitMergeMark(sequenceIndex);
    if (orbitMergeProgress >= mergeMark) return 'is-merged';
    if (orbitMergeProgress >= mergeMark - ORBIT_MERGE_APPROACH_SPAN) return 'is-merging';
    return '';
  };

  return (
    <div className={`landing-page ${motionReduced ? 'is-motion-muted' : ''}`}>
      <Helmet>
        <title>Lekhon | Write, sell, and discover stories in motion</title>
        <meta
          name="description"
          content="Lekhon is a creative home for articles, blogs, shorts, conversations, and products."
        />
        <link rel="preload" as="image" href={asset('inkwell-hero.webp')} />
        <link rel="preload" as="image" href={asset('article-thumb.webp')} media="(min-width: 700px)" />
      </Helmet>

      <section
        className="scroll-film"
        ref={filmRef}
        style={{
          '--film-progress': filmState.progress.toFixed(3),
          '--active-index': filmState.activeIndex,
          '--local-progress': filmState.localProgress.toFixed(3),
          '--orbit-merge-progress': orbitMergeProgress.toFixed(3),
          '--orbit-merge-local': activeMergePulse.toFixed(3),
          '--step-count': scrollFilmSteps.length + 1,
          '--film-height': `${(scrollFilmSteps.length + 1) * 100}vh`,
        }}
      >
        <div className="film-sticky">
          <div className="scroll-rail" aria-hidden="true">
            <span className="rail-line"><span className="rail-progress" /></span>
            {scrollFilmSteps.map((step, index) => (
              <span
                key={step.key}
                className={`rail-dot ${index <= filmState.activeIndex ? 'is-active' : ''}`}
              />
            ))}
            <span className="rail-copy">Story reel</span>
          </div>

          <header className="site-header" id="top">
            <Link className="brand" to="/" aria-label="Lekhon home">
              <img src="/image/lekhon_url.png" alt="Lekhon logo" />
              <span>Lekhon</span>
            </Link>

            <button
              className="nav-toggle"
              type="button"
              aria-expanded={navOpen}
              aria-controls="siteNav"
              onClick={() => setNavOpen((current) => !current)}
            >
              {navOpen ? <FaTimes /> : <FaBars />}
              <span className="sr-only">{navOpen ? 'Close navigation' : 'Open navigation'}</span>
            </button>

            <nav className="site-nav" id="siteNav" aria-label="Primary navigation">
              {navLinks.map((link) => (
                <Link key={link.label} to={link.to}>{link.label}</Link>
              ))}
            </nav>

            <div className="header-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="Open search"
                onClick={() => setSearchOpen(true)}
              >
                <FaSearch />
              </button>
              <button
                className="icon-button"
                type="button"
                title={motionReduced ? 'Enable landing motion' : 'Reduce landing motion'}
                aria-pressed={motionReduced}
                aria-label={motionReduced ? 'Enable landing motion' : 'Reduce landing motion'}
                onClick={() => setMotionReduced((current) => !current)}
              >
                {motionReduced ? <FaPlayCircle /> : <FaPauseCircle />}
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={toggleTheme}
              >
                {isDark ? <FaSun /> : <FaMoon />}
              </button>
              <Link className="primary-button header-cta" to="/create">
                <FaPenNib />
                <span>Start Writing</span>
              </Link>
            </div>

            <form
              className={`search-panel ${searchOpen ? 'is-open' : ''}`}
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearchOpen(false);
              }}
            >
              <label className="sr-only" htmlFor="landingSearch">Search Lekhon</label>
              <FaSearch />
              <input id="landingSearch" type="search" placeholder="Search articles, blogs, shorts..." />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                <FaTimes />
              </button>
            </form>
          </header>

          <main className={`film-canvas is-${activeStep.kind}`}>
            <section className="hero-copy" aria-labelledby="hero-title">
              <h1 id="hero-title">
                <span><em>Write,</em> sell,</span>
                <span>and discover</span>
                <span>stories in motion</span>
              </h1>
              <span className="title-rule" aria-hidden="true" />
              <p>A creative home for articles, blogs, shorts, conversations, and products.</p>
              <div className="hero-actions">
                <Link className="primary-button" to="/create">
                  <FaPenNib />
                  <span>Start Writing</span>
                </Link>
                <Link className="secondary-button" to="/home">
                  <FaBookOpen />
                  <span>Explore Feed</span>
                </Link>
              </div>
            </section>

            <section
              className="film-stage"
              ref={stageRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={resetPointer}
              aria-label="Lekhon orbit cards"
            >
              <div className="stage-grid" aria-hidden="true" />
              <div className="orbit-ring ring-one" aria-hidden="true" />
              <div className="orbit-ring ring-two" aria-hidden="true" />
              <div className="orbit-ring ring-three" aria-hidden="true" />

              <figure
                className="inkwell-figure"
                style={{
                  opacity: mix(1, 0.2, introProgress),
                  transform: [
                    'translate(-50%, -50%)',
                    `scale(${mix(1, 0.72, introProgress)})`,
                    `translateY(${mix(0, 18, introProgress)}px)`,
                    'rotateX(calc(var(--pointer-y) * -3deg))',
                    'rotateY(calc(var(--pointer-x) * 5deg))',
                  ].join(' '),
                }}
              >
                <img src={asset('inkwell-hero.webp')} alt="3D Lekhon inkwell and logo medallion" />
              </figure>

              <div className="orbit-card-rail" aria-label="Lekhon format cards">
                {orbitCards.map((card, index) => (
                  <OrbitCard
                    key={card.key}
                    card={card}
                    displayCard={card.key === ORBIT_MERGE_ANCHOR_KEY ? mergedDisplayCard : undefined}
                    previousDisplayCard={card.key === ORBIT_MERGE_ANCHOR_KEY ? previousMergeDisplayCard : undefined}
                    incomingDisplayCard={card.key === ORBIT_MERGE_ANCHOR_KEY ? incomingMergeDisplayCard : undefined}
                    mergeTransitionStyle={card.key === ORBIT_MERGE_ANCHOR_KEY ? mergeContentTransitionStyle : undefined}
                    mergeTransitionActive={card.key === ORBIT_MERGE_ANCHOR_KEY && activeMergeTransitionIndex >= 0}
                    active={focusedCard === card.key || (card.key === ORBIT_MERGE_ANCHOR_KEY && focusedCard === mergedDisplayCard.key)}
                    style={getOrbitStyle(card, index)}
                    onSelect={setFocusedCard}
                    mergeAnchor={card.key === ORBIT_MERGE_ANCHOR_KEY}
                    mergeState={getMergeState(card.key)}
                  />
                ))}
              </div>
            </section>

            <div className={`feature-layer ${activeStep.kind === 'feature' ? 'is-visible' : ''}`}>
              {activeStep.kind === 'feature' && (
                <FeatureScene step={activeFeature} progress={filmState.localProgress} />
              )}
            </div>

            <div className={`stats-layer ${activeStep.kind === 'stats' ? 'is-visible' : ''}`}>
              {activeStep.kind === 'stats' && <StatsScene />}
            </div>

            <div className={`welcome-layer ${activeStep.kind === 'welcome' ? 'is-visible' : ''}`}>
              {activeStep.kind === 'welcome' && <WelcomeScene />}
            </div>

            <div className="film-progress-strip" aria-hidden="true">
              {scrollFilmSteps.map((step, index) => (
                <span key={step.key} className={index === filmState.activeIndex ? 'is-current' : ''}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              ))}
            </div>
          </main>
        </div>

        <section className="mobile-story" aria-labelledby="mobile-story-title">
          <div className="mobile-story-heading">
            <h2 id="mobile-story-title">Lekhon in action</h2>
            <p>Swipe through the same product film in a phone-friendly rhythm.</p>
          </div>
          <div className="mobile-chapter-rail" aria-label="Feature demos">
            {featureSteps.map((step) => (
              <MobileChapter key={step.key} step={step} />
            ))}
          </div>
          <StatsScene />
          <WelcomeScene />
        </section>

        <section className="reduced-story" aria-labelledby="reduced-story-title">
          <div className="mobile-story-heading">
            <h2 id="reduced-story-title">Lekhon in action</h2>
            <p>Motion is reduced, so every feature is available as a normal readable section.</p>
          </div>
          {featureSteps.map((step) => (
            <article className="reduced-feature" key={step.key}>
              <DemoMockup type={step.demo} />
              <div>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <Link to={step.route}>{step.cta} <FaArrowRight /></Link>
              </div>
            </article>
          ))}
          <StatsScene />
          <WelcomeScene />
        </section>
      </section>
    </div>
  );
};

export default LandingPage;
