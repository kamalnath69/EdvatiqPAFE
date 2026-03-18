import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { listPlans } from '../services/billingApi';

const NAV_SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'stats', label: 'Impact' },
  { id: 'features', label: 'Features' },
  { id: 'platform', label: 'Platform' },
  { id: 'plans', label: 'Plans' },
];

const LOGO_STRIP = [
  {
    name: 'Google',
    src: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  },
  {
    name: 'Nike',
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
  },
  {
    name: 'Adidas',
    src: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg',
  },
  {
    name: 'Under Armour',
    src: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Under_armour_logo.svg',
  },
  {
    name: 'Puma',
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Puma_Logo.svg',
  },
];

const HERO_BADGES = [
  'No wearables required',
  'Real-time posture scoring',
  'AI coach for every athlete',
  'Organization-ready workflows',
];

const STATS = [
  { value: '32%', label: 'Faster technique corrections', icon: <Zap size={18} /> },
  { value: '0-100', label: 'Unified session score', icon: <Target size={18} /> },
  { value: '4.9/5', label: 'Coach satisfaction', icon: <Sparkles size={18} /> },
];

const FEATURE_STRIPS = [
  {
    tag: 'Live Coaching',
    title: 'Instant corrections with live posture intelligence.',
    desc:
      'Track every rep in real time, highlight joint alignment issues, and keep athletes focused on the next correction.',
    bullets: ['Live skeleton overlay', 'Auto-highlight best reps', 'Live correction cues'],
    image: 'https://source.unsplash.com/featured/2200x1400/?archery,training',
  },
  {
    tag: 'Session Intelligence',
    title: 'Turn every session into measurable improvement.',
    desc:
      'Capture scoring, rep quality, and stability trends with clear analytics that coaches and athletes can act on.',
    bullets: ['Session scoring + benchmarks', 'Timeline charts for every athlete', 'Best-rep highlights saved'],
    image: 'https://source.unsplash.com/featured/2200x1400/?olympics,stadium',
  },
  {
    tag: 'Team Operations',
    title: 'One workspace for staff, students, and academy admins.',
    desc:
      'Manage athletes, assign sports, and track progress with secure role-based access for any organization.',
    bullets: ['Academy admin controls', 'Student-specific targets', 'Role-aware dashboards'],
    image: 'https://source.unsplash.com/featured/2200x1400/?weightlifting,gym',
  },
];

const CAPABILITIES = [
  {
    icon: <Target size={18} />,
    title: 'Precision targets',
    desc: 'Set sport-specific targets and tolerances per athlete.',
  },
  {
    icon: <BarChart3 size={18} />,
    title: 'Performance dashboards',
    desc: 'Track progress across sessions and find best reps fast.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Secure collaboration',
    desc: 'RBAC access keeps coaches, admins, and athletes in sync.',
  },
  {
    icon: <Bot size={18} />,
    title: 'AI coach guidance',
    desc: 'Ask the AI coach for improvement plans and drill ideas.',
  },
];

const PLATFORM_STEPS = [
  {
    icon: <Zap size={18} />,
    title: 'Capture',
    desc: 'Launch live coach and start tracking immediately.',
  },
  {
    icon: <TrendingUp size={18} />,
    title: 'Analyze',
    desc: 'Review session scores, best reps, and timelines.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Improve',
    desc: 'Use AI coaching to drive the next training plan.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Arjun Sharma',
    role: 'Performance Coach',
    quote:
      'Edvatiq keeps our training aligned across every athlete. Live corrections and session scores save hours.',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Riya Nair',
    role: 'Academy Admin',
    quote:
      'The dashboards make it easy to see who is improving and where we need to coach harder.',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Karan Mehta',
    role: 'Elite Archer',
    quote:
      'The AI coach feedback is fast and actionable. I can fix posture issues on the spot.',
    avatar: 'https://randomuser.me/api/portraits/men/64.jpg',
  },
];

const FAQS = [
  {
    q: 'Do athletes need wearables or sensors?',
    a: 'No. Edvatiq runs on camera input with posture intelligence and live scoring.',
  },
  {
    q: 'Can I use Edvatiq for personal training only?',
    a: 'Yes. Choose a personal plan for solo training or upgrade to organization plans for teams.',
  },
  {
    q: 'How does the AI coach help?',
    a: 'Ask questions about form, corrections, and drills. The AI coach returns immediate guidance.',
  },
  {
    q: 'Is role-based access included?',
    a: 'Organization plans include academy admin, staff, and student roles out of the box.',
  },
];

const FAQ_CATEGORIES = [
  'Getting Started',
  'Training & Coaching',
  'Analytics & Reports',
  'Pricing & Plans',
  'Security',
];

const DEFAULT_PLANS = [
  {
    code: 'personal_basic',
    name: 'Personal Basic',
    amount_inr: 499,
    description: 'For solo athletes getting started.',
    features: ['Live coach sessions', 'Session history + score', 'Core training analytics'],
  },
  {
    code: 'personal_pro',
    name: 'Personal Pro',
    amount_inr: 999,
    description: 'Advanced tools for serious training.',
    features: ['All Basic features', 'AI coach chat', 'AI session intelligence'],
  },
  {
    code: 'org_basic',
    name: 'Organization Basic',
    amount_inr: 4999,
    description: 'Starter plan for academies and teams.',
    features: ['Academy admin workspace', 'Staff + student management', 'Shared dashboards'],
  },
  {
    code: 'org_pro',
    name: 'Organization Pro',
    amount_inr: 9999,
    description: 'Enterprise-grade scale and reporting.',
    features: ['All Org Basic features', 'AI coach chat', 'AI analytics suite'],
  },
];

const IMAGE_SET = {
  heroMain: 'https://source.unsplash.com/featured/2400x1600/?archery,athlete',
  heroAltOne: 'https://source.unsplash.com/featured/1600x1200/?olympics,training',
  heroAltTwo: 'https://source.unsplash.com/featured/1600x1200/?weightlifting,athlete',
};

const FALLBACK_IMAGE =
  'https://source.unsplash.com/featured/1600x1200/?archery,olympics';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Landing() {
  const [activeSection, setActiveSection] = useState('hero');
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState(FAQ_CATEGORIES[0]);
  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  const registerSection = (id) => (el) => {
    if (el) sectionRefs.current[id] = el;
  };

  const handleNavClick = (id) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const navItems = useMemo(
    () =>
      NAV_SECTIONS.map((item) => ({
        ...item,
        active: activeSection === item.id,
      })),
    [activeSection]
  );

  const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallback === '1') return;
    event.currentTarget.dataset.fallback = '1';
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  useEffect(() => {
    listPlans()
      .then((data) => {
        if (Array.isArray(data) && data.length) setPlans(data);
      })
      .catch(() => {});
  }, []);

  const formatPrice = (amount) => (Number.isFinite(amount) ? `INR ${amount.toLocaleString('en-IN')} / month` : '--');

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }
    );
    observerRef.current = observer;
    NAV_SECTIONS.forEach((section) => {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-shell">
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <Link className="brand-lockup" to="/">
            <div className="brand-icon">E</div>
            <div>
              <p className="brand-kicker">Performance Intelligence</p>
              <h1>Edvatiq</h1>
            </div>
          </Link>
          <nav className="landing-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`landing-link ${item.active ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="landing-actions">
            <Link className="ghost-button" to="/login">Login</Link>
            <Link className="ghost-button" to="/support">Support</Link>
            <Link className="primary-button demo-button" to="/book-demo">
              Book a Demo <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </header>

      <motion.section
        id="hero"
        ref={registerSection('hero')}
        className="hero-section landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={stagger}
      >
        <div className="hero-ornaments" aria-hidden="true">
          <svg className="hero-ornament hero-ornament-left" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="rgba(247, 201, 72, 0.18)" />
            <circle cx="100" cy="100" r="60" fill="rgba(247, 201, 72, 0.12)" />
          </svg>
          <svg className="hero-ornament hero-ornament-right" viewBox="0 0 240 240">
            <path
              d="M32 40C88 12 152 4 208 32C232 44 236 84 208 108C152 156 92 188 40 208C16 216 4 196 12 176C32 124 44 88 32 40Z"
              fill="rgba(17, 17, 17, 0.08)"
            />
          </svg>
        </div>
        <div className="hero-target" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" fill="rgba(247, 201, 72, 0.12)" stroke="#111111" strokeWidth="2" />
            <circle cx="60" cy="60" r="36" fill="rgba(247, 201, 72, 0.2)" stroke="#111111" strokeWidth="2" />
            <circle cx="60" cy="60" r="16" fill="#111111" />
          </svg>
        </div>
        <div className="hero-archer" aria-hidden="true">
          <svg viewBox="0 0 260 200" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="70" cy="45" r="12" fill="#111111" />
            <path d="M70 58 L70 110" />
            <path d="M70 80 L110 70" />
            <path d="M70 80 L110 110" />
            <path d="M110 70 Q160 90 110 110" />
            <g className="archer-arrow">
              <line x1="110" y1="90" x2="180" y2="90" />
              <polygon points="180,90 170,84 170,96" fill="#111111" stroke="none" />
            </g>
          </svg>
        </div>
        <motion.div className="hero-copy" variants={stagger}>
          <motion.span className="hero-chip" variants={fadeUp}>
            Edvatiq Performance Platform
          </motion.span>
          <motion.h2 variants={fadeUp}>
            Camera-first coaching that turns training into measurable progress.
          </motion.h2>
          <motion.p className="hero-subtitle" variants={fadeUp}>
            Edvatiq brings live posture intelligence, session scoring, and AI coaching together so every athlete
            knows exactly what to fix next.
          </motion.p>
          <motion.div className="hero-cta" variants={fadeUp}>
            <Link className="primary-button demo-button" to="/book-demo">
              Book a Demo <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/pricing">View Plans</Link>
          </motion.div>
          <motion.div className="hero-proof" variants={fadeUp}>
            {HERO_BADGES.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </motion.div>
        </motion.div>
        <motion.div className="hero-media" variants={fadeUp}>
          <div className="hero-screen">
            <img src={IMAGE_SET.heroMain} alt="Athlete training" loading="lazy" onError={handleImageError} />
            <div className="hero-metrics">
              <div>
                <strong>Live Tracking</strong>
                <div>Posture + angles</div>
              </div>
              <div>
                <strong>Session Score</strong>
                <div>0-100 performance</div>
              </div>
              <div>
                <strong>AI Coach</strong>
                <div>Real-time guidance</div>
              </div>
            </div>
          </div>
          <div className="hero-stack">
            <img src={IMAGE_SET.heroAltOne} alt="Training detail" loading="lazy" onError={handleImageError} />
            <img src={IMAGE_SET.heroAltTwo} alt="Coach detail" loading="lazy" onError={handleImageError} />
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        className="logo-strip landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeIn}
      >
        <p className="brand-kicker">Trusted by performance teams</p>
        <div className="logo-row">
          {LOGO_STRIP.map((logo) => (
            <img key={logo.name} src={logo.src} alt={`${logo.name} logo`} loading="lazy" />
          ))}
        </div>
      </motion.section>

      <motion.section
        id="stats"
        ref={registerSection('stats')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Performance gains you can prove</h3>
          <p>See how Edvatiq accelerates training for athletes and teams.</p>
        </motion.div>
        <motion.div className="stat-strip" variants={stagger}>
          {STATS.map((stat) => (
            <motion.div key={stat.label} className="stat-tile" variants={fadeUp}>
              <div className="stat-icon">{stat.icon}</div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="features"
        ref={registerSection('features')}
        className="landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Everything you need to coach better</h3>
          <p>Live intelligence, analytics, and operational tools in one system.</p>
        </motion.div>
        <motion.div className="split-stack" variants={stagger}>
          {FEATURE_STRIPS.map((item, index) => (
            <motion.div key={item.title} className={`split-section ${index % 2 === 1 ? 'reverse' : ''}`} variants={fadeUp}>
              <div className="split-content">
                <span className="split-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p className="hero-subtitle">{item.desc}</p>
                <ul className="split-list">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>
                      <CheckCircle2 size={16} />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Link className="ghost-button" to="/book-demo">See it in action</Link>
              </div>
              <div className="split-media">
                <img src={item.image} alt={item.title} loading="lazy" onError={handleImageError} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="platform"
        ref={registerSection('platform')}
        className="landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Built for performance operations</h3>
          <p>Edvatiq keeps every athlete, coach, and admin aligned in one workspace.</p>
        </motion.div>
        <motion.div className="capability-grid" variants={stagger}>
          {CAPABILITIES.map((item) => (
            <motion.div key={item.title} className="capability-card" variants={fadeUp}>
              <div className="feature-icon">{item.icon}</div>
              <h4>{item.title}</h4>
              <p className="hero-subtitle">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className="platform-steps" variants={stagger}>
          {PLATFORM_STEPS.map((step) => (
            <motion.div key={step.title} className="platform-step" variants={fadeUp}>
              <div className="feature-icon">{step.icon}</div>
              <h4>{step.title}</h4>
              <p className="hero-subtitle">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="testimonials"
        ref={registerSection('testimonials')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Teams love the Edvatiq workflow</h3>
          <p>Performance staff and athletes rely on Edvatiq every day.</p>
        </motion.div>
        <motion.div className="testimonial-grid" variants={stagger}>
          {TESTIMONIALS.map((item) => (
            <motion.div key={item.name} className="testimonial-card" variants={fadeUp}>
              <div className="testimonial-head">
                <div className="testimonial-avatar">
                  <img src={item.avatar} alt={item.name} loading="lazy" onError={handleImageError} />
                  <div>
                    <strong>{item.name}</strong>
                    <div className="hero-subtitle">{item.role}</div>
                  </div>
                </div>
                <div className="testimonial-stars">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={`${item.name}-star-${idx}`} size={16} />
                  ))}
                </div>
              </div>
              <p>"{item.quote}"</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="plans"
        ref={registerSection('plans')}
        className="plans-section landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Plans for every scale</h3>
          <p>Start personal or equip a full academy in minutes.</p>
        </motion.div>
        <motion.div className="plans-grid" variants={stagger}>
          {plans.map((plan) => (
            <motion.article key={plan.code || plan.name} className="plan-card" variants={fadeUp}>
              <div>
                <p className="plan-tier">{plan.name}</p>
                <h4>{formatPrice(plan.amount_inr)}</h4>
                <p className="plan-subtitle">{plan.description || 'Flexible training plan.'}</p>
              </div>
              <ul>
                {(plan.features || []).map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link className="primary-button" to={`/signup?plan=${plan.code || ''}`}>Choose Plan</Link>
            </motion.article>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="faq"
        ref={registerSection('faq')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <motion.div className="section-head" variants={fadeUp}>
          <h3>Frequently asked questions</h3>
          <p>Need more details? We are ready to walk you through it.</p>
        </motion.div>
        <div className="faq-layout">
          <div className="faq-categories">
            {FAQ_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`faq-category ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <motion.div className="faq-accordions" variants={stagger}>
            {FAQS.map((item) => {
              const isOpen = openFaq === item.q;
              return (
                <motion.div key={item.q} className="faq-item" variants={fadeUp}>
                  <button
                    type="button"
                    className={`faq-trigger ${isOpen ? 'open' : ''}`}
                    onClick={() => setOpenFaq(isOpen ? null : item.q)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        className="faq-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        <p className="hero-subtitle">{item.a}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="cta-section landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
      >
        <div className="cta-ornament" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="rgba(247, 201, 72, 0.2)" />
            <circle cx="100" cy="100" r="55" fill="rgba(247, 201, 72, 0.12)" />
          </svg>
        </div>
        <div>
          <h3>Ready to elevate performance?</h3>
          <p className="hero-subtitle">Start a personal plan or onboard your academy in minutes.</p>
        </div>
        <div className="cta-actions">
          <Link className="primary-button demo-button" to="/book-demo">Book a Demo</Link>
          <Link className="ghost-button" to="/signup?plan=personal_basic">Start Personal</Link>
        </div>
      </motion.section>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand-icon">E</div>
            <div>
              <h4>Edvatiq</h4>
              <p className="hero-subtitle">Performance intelligence for modern athletes and academies.</p>
            </div>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><button type="button" onClick={() => handleNavClick('features')}>Features</button></li>
              <li><button type="button" onClick={() => handleNavClick('platform')}>Platform</button></li>
              <li><button type="button" onClick={() => handleNavClick('plans')}>Plans</button></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><Link to="/support">Support</Link></li>
              <li><Link to="/book-demo">Book a Demo</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>
          <div className="footer-cta">
            <div className="footer-cta-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h5>Talk to the team</h5>
              <p className="hero-subtitle">
                Get a tailored walkthrough for your academy or squad in under 30 minutes.
              </p>
              <div className="footer-cta-actions">
                <Link className="primary-button demo-button" to="/book-demo">Book a Demo</Link>
                <Link className="ghost-button" to="/support">Contact Support</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>(c) 2026 Edvatiq</span>
          <span>Performance Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
