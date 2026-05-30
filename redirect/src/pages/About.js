import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBell,
  FaChartLine,
  FaCheck,
  FaCloud,
  FaCode,
  FaComments,
  FaDatabase,
  FaGlobe,
  FaHeart,
  FaKeyboard,
  FaLock,
  FaPaintBrush,
  FaPen,
  FaPlug,
  FaRobot,
  FaRocket,
  FaShieldAlt,
  FaTrophy,
  FaUserShield,
  FaUsers,
  FaVideo
} from 'react-icons/fa';

const features = [
  {
    icon: FaPen,
    title: 'Rich Writing Tools',
    desc: 'Markdown editor, drafts, scheduling, and more',
    color: 'from-blue-500 to-cyan-500',
    delay: 0
  },
  {
    icon: FaUsers,
    title: 'Social Connection',
    desc: 'Follow, like, comment, and build your community',
    color: 'from-purple-500 to-pink-500',
    delay: 100
  },
  {
    icon: FaVideo,
    title: 'Real-time Communication',
    desc: 'Chat, voice, and video calls with your audience',
    color: 'from-green-500 to-emerald-500',
    delay: 200
  },
  {
    icon: FaBell,
    title: 'Smart Notifications',
    desc: 'Stay updated without being overwhelmed',
    color: 'from-orange-500 to-red-500',
    delay: 300
  },
  {
    icon: FaGlobe,
    title: 'Multi-language',
    desc: 'Write and read in your preferred language',
    color: 'from-indigo-500 to-blue-500',
    delay: 400
  },
  {
    icon: FaRobot,
    title: 'AI Assistant',
    desc: 'Get help with ideas, bios, and more',
    color: 'from-pink-500 to-rose-500',
    delay: 500
  }
];

const chapters = [
  {
    chapter: 1,
    title: 'The Dark Overlay Problem',
    story:
      'Our journey began with a visual issue. Blog cards had heavy overlays making images too dark. We lightened them, letting beautiful images shine through while keeping text readable.'
  },
  {
    chapter: 2,
    title: 'Bringing Softness',
    story:
      'Detail pages needed comfort. We added soft pastel gradients and glassmorphism cards that feel calm and easy to read. The goal: reading should feel comfortable.'
  },
  {
    chapter: 3,
    title: 'Creative Homepage',
    story:
      'While detail pages were soft, the homepage needed personality. We introduced subtle accents, lively interactions, and balance without overwhelming users.'
  },
  {
    chapter: 4,
    title: 'Profile Transformation',
    story:
      'The profile evolved into a full dashboard with activity stats, achievements, privacy controls, API keys for developers, and a responsive two-column layout.'
  },
  {
    chapter: 5,
    title: 'Humanization Phase',
    story:
      'We reduced heavy effects, softened tones, and tightened spacing so the design feels organic and human instead of over-stylized.'
  },
  {
    chapter: 6,
    title: 'Real-time Features',
    story:
      'Socket-based messaging, 1-on-1 call support, group call workflow, and smarter notifications made communication feel immediate and dependable.'
  },
  {
    chapter: 7,
    title: 'AI Integration',
    story:
      'An assistant was introduced to help with bios, content support, and feature guidance so creators can move faster with less friction.'
  },
  {
    chapter: 8,
    title: 'Achievement System',
    story:
      'Story-based achievements and progress tracking made growth visible and motivating, from early milestones to long-term consistency.'
  }
];

const workflow = [
  {
    icon: FaPen,
    title: '1. Write & Create',
    text:
      'Use the Markdown editor with preview, save drafts, schedule posts, add tags, and upload media. Create blogs, articles, or short posts.'
  },
  {
    icon: FaGlobe,
    title: '2. Publish & Share',
    text:
      'Publish instantly or schedule ahead. Share content and keep presentation clean across devices with consistent formatting.'
  },
  {
    icon: FaComments,
    title: '3. Connect & Engage',
    text:
      'Follow creators, react, comment, and chat. Send files or voice notes, and use calling features for deeper collaboration.'
  },
  {
    icon: FaChartLine,
    title: '4. Grow & Track',
    text:
      'Measure views, likes, and comments, monitor progress blocks, and keep momentum through consistency-focused tools.'
  }
];

const deepDive = [
  {
    icon: FaKeyboard,
    title: 'Advanced Editor',
    text:
      'Markdown editing with preview, media support, draft flow, and scheduling support. Built for speed and readability.',
    tags: ['Markdown', 'Auto-save', 'Scheduling', 'Image Upload'],
    color: '#2563eb'
  },
  {
    icon: FaComments,
    title: 'Real-time Communication',
    text:
      'Fast messaging with files and voice notes, plus call workflows for direct and group conversations.',
    tags: ['Socket.IO', 'WebRTC', 'LiveKit', 'Voice Messages'],
    color: '#9333ea'
  },
  {
    icon: FaBell,
    title: 'Smart Notifications',
    text:
      'Activity notifications with better grouping and cleaner alerts so important events are visible without noise.',
    tags: ['Real-time', 'Grouping', 'Auto-cleanup', 'Alerts'],
    color: '#16a34a'
  },
  {
    icon: FaTrophy,
    title: 'Gamification',
    text:
      'Achievement progress and streak-oriented milestones that make growth visible and rewarding.',
    tags: ['Achievements', 'Streaks', 'Milestones', 'Progress'],
    color: '#ea580c'
  }
];

const values = [
  {
    icon: FaShieldAlt,
    title: 'Privacy First',
    desc: 'Your data is yours. Security and user control are foundational.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: FaHeart,
    title: 'Community Driven',
    desc: 'Built with creator feedback. The product evolves from real user needs.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: FaRocket,
    title: 'Always Evolving',
    desc: 'Continuous improvements with practical updates across UX and reliability.',
    color: 'from-green-500 to-emerald-500'
  }
];

const About = () => {
  const navigate = useNavigate();
  const [visibleSections, setVisibleSections] = useState([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => [...new Set([...prev, entry.target.id])]);
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id) => visibleSections.includes(id);

  return (
    <div className="min-h-screen theme-page-bg">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition"
        >
          <FaArrowLeft /> Back
        </button>

        <div className="text-center mb-16 animate-fade-in">
          <h1
            className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            Lekhon
          </h1>
          <p className="text-xl md:text-2xl text-[var(--text-secondary)] font-light">
            Where Stories Come to Life
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {['Modern', 'Creative', 'Connected'].map((label) => (
              <div
                key={label}
                className="px-5 py-2 rounded-full font-semibold border border-[var(--border-default)] bg-[var(--tag-bg)] text-[var(--tag-text)]"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <section
          id="journey"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('journey') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="theme-modal-card rounded-3xl p-8 md:p-12 shadow-2xl border border-[var(--border-default)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
              >
                <FaRocket className="text-3xl" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">The Journey Begins</h2>
            </div>
            <p className="text-lg md:text-xl leading-relaxed mb-4 text-[var(--text-primary)]">
              In a world overflowing with content, we asked ourselves:{' '}
              <span className="font-bold italic">"What if blogging could be more?"</span>
            </p>
            <p className="text-base md:text-lg leading-relaxed text-[var(--text-secondary)]">
              Lekhon was built to help writers not just publish, but connect, grow, and inspire. A place where every
              story finds the right audience.
            </p>
          </div>
        </section>

        <section
          id="trust"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('trust') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="theme-modal-card rounded-3xl border border-[var(--border-default)] p-7 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                  Public app overview
                </p>
                <h2 className="mb-4 text-3xl font-bold leading-tight text-[var(--text-primary)] md:text-4xl">
                  A clear home for writing, reading, and creative community.
                </h2>
                <p className="text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                  Lekhon helps users publish blogs, long-form articles, short posts, stories, and community updates.
                  Readers can discover public content, writers can manage their profiles, and members can connect through
                  comments, messaging, and social account connections.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                  <FaUserShield className="text-[var(--brand-primary)]" /> Google Sign-In usage
                </h3>
                <p className="mb-5 leading-7 text-[var(--text-secondary)]">
                  Google Sign-In is used only for authentication, account creation, and account management. With user
                  consent, Lekhon may receive a name, email address, and profile image to set up and protect the account.
                </p>
                <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
                  {[
                    ['Authentication', 'Confirm account access securely.'],
                    ['Profile setup', 'Display approved account identity inside Lekhon.'],
                    ['Account safety', 'Support essential notices and account recovery workflows.'],
                  ].map(([label, text]) => (
                    <div key={label} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                      <p className="m-0">
                        <span className="font-bold text-[var(--text-primary)]">{label}:</span> {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--text-primary)]">
            What Makes Us Special
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                id={`feature-${idx}`}
                data-animate
                className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ${
                  isVisible(`feature-${idx}`) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{ transitionDelay: `${feature.delay}ms` }}
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform hover:rotate-6 transition-transform`}
                >
                  <feature.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="timeline"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('timeline') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--text-primary)]">
            Our Story in Chapters
          </h2>
          <div className="space-y-8">
            {chapters.map((chapter) => (
              <div key={chapter.chapter} className="flex gap-6 items-start">
                <div
                  className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
                >
                  {chapter.chapter}
                </div>
                <div className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2">{chapter.title}</h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{chapter.story}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="howitworks"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('howitworks') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--text-primary)]">
            How Lekhon Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {workflow.map((item) => (
              <div
                key={item.title}
                className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-lg"
              >
                <item.icon className="text-4xl mb-4 text-[var(--brand-primary)]" />
                <h3 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-3">{item.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="deepdive"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('deepdive') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--text-primary)]">
            Features That Make a Difference
          </h2>
          <div className="space-y-6">
            {deepDive.map((block) => (
              <div
                key={block.title}
                className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-lg"
                style={{ borderLeftWidth: '4px', borderLeftColor: block.color }}
              >
                <h3 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2" style={{ color: block.color }}>
                  <block.icon /> {block.title}
                </h3>
                <p className="text-[var(--text-secondary)] mb-3 leading-relaxed">{block.text}</p>
                <div className="flex flex-wrap gap-2">
                  {block.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm border border-[var(--border-default)] bg-[var(--tag-bg)] text-[var(--tag-text)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="security"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('security') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}
        >
          <div className="theme-modal-card rounded-3xl p-8 md:p-12 border border-[var(--border-default)] shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[var(--text-primary)]">
              Security & Privacy First
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
                  <FaLock className="text-[var(--brand-primary)]" /> Security Measures
                </h3>
                <ul className="space-y-3 text-base md:text-lg text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Password hashing with bcrypt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>JWT authentication with expiry controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>API key support for developer access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Input validation and sanitization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Secure file upload validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Protected routes and middleware</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
                  <FaUserShield className="text-[var(--brand-primary)]" /> Privacy Controls
                </h3>
                <ul className="space-y-3 text-base md:text-lg text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Profile visibility settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Email and phone visibility controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Message permission options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Account deletion with verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>Data export support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCheck className="mt-1 text-emerald-500 shrink-0" />
                    <span>No data selling policy</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="tech"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('tech') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="theme-modal-card rounded-3xl p-8 md:p-12 border border-[var(--border-default)] shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-[var(--text-primary)]">
              Built with Modern Technology
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Frontend</h3>
                <ul className="space-y-2 text-base md:text-lg text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <FaCode className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>React 18 for modern UI architecture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaPaintBrush className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>Tailwind CSS with design-token based theming</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaPlug className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>Socket-driven real-time interactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaVideo className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>WebRTC and LiveKit call workflows</span>
                  </li>
                </ul>
              </div>
              <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Backend</h3>
                <ul className="space-y-2 text-base md:text-lg text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <FaCode className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>Node.js and Express APIs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaDatabase className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>MongoDB data layer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaLock className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>JWT and bcrypt security stack</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FaCloud className="mt-1 text-[var(--brand-primary)] shrink-0" />
                    <span>Cloud media storage integration</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          id="values"
          data-animate
          className={`mb-20 transition-all duration-1000 ${
            isVisible('values') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[var(--text-primary)]">
            What We Believe In
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((item) => (
              <div
                key={item.title}
                className="text-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-lg"
              >
                <div
                  className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center`}
                >
                  <item.icon className="text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center mb-12">
          <div
            className="rounded-3xl p-8 md:p-12 text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Join creators sharing stories, ideas, and progress on Lekhon
            </p>
            <button
              onClick={() => navigate('/create')}
              className="bg-white text-[var(--brand-primary)] px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-lg"
            >
              Create Your First Post
            </button>
          </div>
        </section>

        <div className="text-center text-[var(--text-secondary)] py-8">
          <p className="text-lg flex items-center justify-center gap-2">
            Made with <FaHeart className="text-rose-500" /> for writers, by writers
          </p>
          <p className="text-sm mt-2">(c) 2026 Lekhon. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
