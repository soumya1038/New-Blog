import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRocket, FaPen, FaUsers, FaVideo, FaBell, FaGlobe, FaRobot, FaShieldAlt, FaHeart, FaChartLine, FaComments, FaKeyboard, FaTrophy, FaLock, FaUserShield, FaCheck, FaCode, FaPaintBrush, FaPlug, FaCloud, FaDatabase } from 'react-icons/fa';

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
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 font-semibold text-[var(--brand-primary)] hover:opacity-80 transition">
          <FaArrowLeft /> Back
        </button>

        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Lekhon
          </h1>
          <p className="text-2xl text-gray-700 dark:text-gray-300 font-light">
            Where Stories Come to Life
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <div className="px-6 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 font-semibold">
              Modern
            </div>
            <div className="px-6 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700 dark:text-purple-300 font-semibold">
              Creative
            </div>
            <div className="px-6 py-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-700 dark:text-pink-300 font-semibold">
              Connected
            </div>
          </div>
        </div>

        {/* The Journey Begins */}
        <section 
          id="journey" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('journey') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-12 text-white shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <FaRocket className="text-5xl animate-bounce" />
              <h2 className="text-4xl font-bold">The Journey Begins</h2>
            </div>
            <p className="text-xl leading-relaxed mb-4">
              In a world overflowing with content, we asked ourselves: <span className="font-bold italic">"What if blogging could be more?"</span>
            </p>
            <p className="text-lg leading-relaxed opacity-90">
              Lekhon was born from a simple vision - to create a platform where writers don't just publish, they connect, grow, and inspire. 
              A place where every word matters, every story finds its audience, and every creator feels at home.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">
            What Makes Us Special
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FaPen, title: 'Rich Writing Tools', desc: 'Markdown editor, drafts, scheduling, and more', color: 'from-blue-500 to-cyan-500', delay: 0 },
              { icon: FaUsers, title: 'Social Connection', desc: 'Follow, like, comment, and build your community', color: 'from-purple-500 to-pink-500', delay: 100 },
              { icon: FaVideo, title: 'Real-time Communication', desc: 'Chat, voice, and video calls with your audience', color: 'from-green-500 to-emerald-500', delay: 200 },
              { icon: FaBell, title: 'Smart Notifications', desc: 'Stay updated without being overwhelmed', color: 'from-orange-500 to-red-500', delay: 300 },
              { icon: FaGlobe, title: 'Multi-language', desc: 'Write and read in your preferred language', color: 'from-indigo-500 to-blue-500', delay: 400 },
              { icon: FaRobot, title: 'AI Assistant', desc: 'Get help with ideas, bios, and more', color: 'from-pink-500 to-rose-500', delay: 500 }
            ].map((feature, idx) => (
              <div
                key={idx}
                id={`feature-${idx}`}
                data-animate
                className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 ${
                  isVisible(`feature-${idx}`) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{ transitionDelay: `${feature.delay}ms` }}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform hover:rotate-12 transition-transform`}>
                  <feature.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Story Timeline */}
        <section 
          id="timeline" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('timeline') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
        >
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">
            Our Story in Chapters
          </h2>
          <div className="space-y-8">
            {[
              { chapter: 1, title: 'The Dark Overlay Problem', story: 'Our journey began with a visual issue. Blog cards had heavy overlays making images too dark. We lightened them, letting beautiful images shine through while keeping text readable.' },
              { chapter: 2, title: 'Bringing Softness', story: 'Detail pages needed comfort. We added soft pastel gradients (slate-50, blue-50, purple-50) and glassmorphism cards - calm, readable, easy on the eyes. The goal: make reading a pleasure, not a strain.' },
              { chapter: 3, title: 'Creative Homepage', story: 'While detail pages were soft, the homepage needed personality! Gradient glows on search bars, colored category dots, 3D card rotations, animated badges - creative but not overwhelming. Balance was key.' },
              { chapter: 4, title: 'Profile Transformation', story: 'The biggest evolution. From a simple profile to a complete dashboard with activity stats, achievements with gamification, privacy controls, API keys for developers, and a beautiful 2-column responsive layout.' },
              { chapter: 5, title: 'Humanization Phase', story: 'We removed heavy effects, softened colors (from 100 to 50 shades), reduced text sizes, used subtle shadows. The result? A design that feels organic and human, not robotic or over-designed.' },
              { chapter: 6, title: 'Real-time Features', story: 'Added Socket.IO for instant messaging, WebRTC for 1-on-1 calls, LiveKit for group video calls. Real-time notifications with smart grouping and auto-cleanup. Communication became seamless.' },
              { chapter: 7, title: 'AI Integration', story: 'Integrated AI chatbot assistant powered by Groq API. Helps with bio generation, content ideas, and answering questions. Making technology work for creators, not against them.' },
              { chapter: 8, title: 'Achievement System', story: 'Gamification with story-based achievements. Each milestone tells a journey - from first post to legendary creator. Visual progress paths, login streaks, and mastery crowns. Making progress visible and rewarding.' }
            ].map((chapter, idx) => (
              <div key={idx} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {chapter.chapter}
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{chapter.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{chapter.story}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section 
          id="howitworks" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('howitworks') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">
            How Lekhon Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <FaPen className="text-4xl mb-4 text-blue-600" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">1. Write & Create</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Use our powerful Markdown editor with live preview. Save drafts, schedule posts, add tags, and upload images. 
                Create full blogs, articles, or quick shorts (Twitter-like posts). AI assistant helps with ideas and bios.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <FaGlobe className="text-4xl mb-4 text-indigo-600" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">2. Publish & Share</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Publish instantly or schedule for later. Share on social media with one click. Generate QR codes for your profile. 
                Your content is beautifully formatted with syntax highlighting and responsive images.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <FaComments className="text-4xl mb-4 text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">3. Connect & Engage</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Follow creators, like posts, leave comments. Real-time chat with text, voice messages, and file sharing. 
                Make 1-on-1 or group video calls. React to messages, pin important ones, see read receipts.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <FaChartLine className="text-4xl mb-4 text-emerald-600" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">4. Grow & Track</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                View detailed analytics - views, likes, comments. Track your activity with GitHub-style heatmaps. 
                Unlock achievements as you grow. See profile completeness. Monitor your best login streaks.
              </p>
            </div>
          </div>
        </section>

        {/* Key Features Deep Dive */}
        <section 
          id="deepdive" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('deepdive') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">
            Features That Make a Difference
          </h2>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2"><FaKeyboard /> Advanced Editor</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                SimpleMDE Markdown editor with dark/light theme sync. Live preview, syntax highlighting, image uploads via Cloudinary. 
                Auto-save drafts every 30 seconds. Word count and estimated reading time. Schedule posts for future publication.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">Markdown</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">Auto-save</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">Scheduling</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">Image Upload</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2"><FaComments /> Real-time Communication</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Socket.IO powered instant messaging. Send text, voice messages, images, and files. Message reactions and quick responses. 
                Pin important messages. Read receipts and typing indicators. 1-on-1 audio/video calls with WebRTC. Group video calls with LiveKit.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">Socket.IO</span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">WebRTC</span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">LiveKit</span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">Voice Messages</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2"><FaBell /> Smart Notifications</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Real-time notifications for likes, comments, follows, and messages. Smart grouping ("John and 5 others liked your post"). 
                Auto-cleanup of old notifications. Sound alerts with volume control. Mark as read/unread. Filter by type.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">Real-time</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">Grouping</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">Auto-cleanup</span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">Sound Alerts</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2"><FaTrophy /> Gamification</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                10 unique achievements with story-based progression. Track posts, likes, views, comments, login streaks, and membership days. 
                Visual milestone paths showing past, current, and future goals. Unlock crowns when you master an achievement. Best streak tracking.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">Achievements</span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">Streaks</span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">Milestones</span>
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">Progress Tracking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Privacy */}
        <section 
          id="security" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('security') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
        >
          <div className="bg-gradient-to-br from-gray-900 to-indigo-900 dark:from-gray-800 dark:to-indigo-800 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-8 text-center">Security & Privacy First</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-blue-300 flex items-center gap-2"><FaLock /> Security Measures</h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Password hashing with bcrypt (10 rounds)</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>JWT token authentication with expiry</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>API key authentication for developers</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Input validation & sanitization</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>File upload validation (type & size)</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Protected routes & middleware</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Email verification system</span></li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4 text-green-300 flex items-center gap-2"><FaUserShield /> Privacy Controls</h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Profile visibility settings (Public/Friends/Private)</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Control email & phone visibility</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Message permission controls</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Account deletion with verification</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>Data export capabilities</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>GDPR compliant practices</span></li>
                  <li className="flex items-start gap-2"><FaCheck className="mt-1 text-emerald-400 shrink-0" /> <span>No data selling, ever</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section 
          id="tech" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('tech') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-8 text-center">Built with Modern Technology</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-blue-400">Frontend</h3>
                <ul className="space-y-2 text-lg">
                  <li className="flex items-start gap-2"><FaCode className="mt-1 text-blue-300 shrink-0" /> <span>React 18 - Modern UI library</span></li>
                  <li className="flex items-start gap-2"><FaPaintBrush className="mt-1 text-pink-300 shrink-0" /> <span>Tailwind CSS - Utility-first styling</span></li>
                  <li className="flex items-start gap-2"><FaPlug className="mt-1 text-purple-300 shrink-0" /> <span>Socket.IO - Real-time communication</span></li>
                  <li className="flex items-start gap-2"><FaVideo className="mt-1 text-cyan-300 shrink-0" /> <span>WebRTC & LiveKit - Video calls</span></li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4 text-green-400">Backend</h3>
                <ul className="space-y-2 text-lg">
                  <li className="flex items-start gap-2"><FaCode className="mt-1 text-green-300 shrink-0" /> <span>Node.js & Express - Server framework</span></li>
                  <li className="flex items-start gap-2"><FaDatabase className="mt-1 text-emerald-300 shrink-0" /> <span>MongoDB - Database</span></li>
                  <li className="flex items-start gap-2"><FaLock className="mt-1 text-yellow-300 shrink-0" /> <span>JWT & bcrypt - Security</span></li>
                  <li className="flex items-start gap-2"><FaCloud className="mt-1 text-sky-300 shrink-0" /> <span>Cloudinary - Media storage</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section 
          id="values" 
          data-animate 
          className={`mb-20 transition-all duration-1000 ${isVisible('values') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">
            What We Believe In
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <FaShieldAlt className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Privacy First</h3>
              <p className="text-gray-600 dark:text-gray-400">Your data is yours. We protect it with industry-standard security.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <FaHeart className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Community Driven</h3>
              <p className="text-gray-600 dark:text-gray-400">Built by creators, for creators. Your feedback shapes our future.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <FaRocket className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Always Evolving</h3>
              <p className="text-gray-600 dark:text-gray-400">We never stop improving. New features, better experience, constantly.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center mb-12">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of creators sharing their stories on Lekhon</p>
            <button 
              onClick={() => navigate('/create')}
              className="bg-white text-purple-600 px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-lg"
            >
              Create Your First Post
            </button>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          <p className="text-lg flex items-center justify-center gap-2">Made with <FaHeart className="text-rose-500" /> for writers, by writers</p>
          <p className="text-sm mt-2">(c) 2024 Lekhon. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default About;

