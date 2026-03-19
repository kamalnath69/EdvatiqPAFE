import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, m } from 'framer-motion';
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
    metrics: ['Pose lock 96%', 'Cue latency 34 ms', 'Best rep 88/100'],
  },
  {
    tag: 'Session Intelligence',
    title: 'Turn every session into measurable improvement.',
    desc:
      'Capture scoring, rep quality, and stability trends with clear analytics that coaches and athletes can act on.',
    bullets: ['Session scoring + benchmarks', 'Timeline charts for every athlete', 'Best-rep highlights saved'],
    metrics: ['Session score +18%', 'Trend clarity high', 'Benchmarks synced'],
  },
  {
    tag: 'Team Operations',
    title: 'One workspace for staff, students, and academy admins.',
    desc:
      'Manage athletes, assign sports, and track progress with secure role-based access for any organization.',
    bullets: ['Academy admin controls', 'Student-specific targets', 'Role-aware dashboards'],
    metrics: ['12 staff online', '24 athletes tracked', 'RBAC secure'],
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
    category: 'Getting Started',
    q: 'Do athletes need wearables or sensors?',
    a: 'No. Edvatiq runs on camera input with posture intelligence and live scoring.',
  },
  {
    category: 'Pricing & Plans',
    q: 'Can I use Edvatiq for personal training only?',
    a: 'Yes. Choose a personal plan for solo training or upgrade to organization plans for teams.',
  },
  {
    category: 'Training & Coaching',
    q: 'How does the AI coach help?',
    a: 'Ask questions about form, corrections, and drills. The AI coach returns immediate guidance.',
  },
  {
    category: 'Security',
    q: 'Is role-based access included?',
    a: 'Organization plans include academy admin, staff, and student roles out of the box.',
  },
  {
    category: 'Analytics & Reports',
    q: 'What can coaches review after a session?',
    a: 'Coaches can review unified scores, best-rep highlights, trend charts, and session-level progress over time.',
  },
];

const TRUST_PILLARS = [
  {
    title: 'Role-aware access',
    desc: 'Separate academy admin, staff, and athlete experiences with permissioned workflows built in.',
    stat: 'RBAC native',
  },
  {
    title: 'Camera-first deployment',
    desc: 'No wearables, no complex hardware stack, and no extra setup burden for the athlete.',
    stat: 'Setup in minutes',
  },
  {
    title: 'Coach-readable reporting',
    desc: 'Session scoring, best reps, and review notes are structured so coaches can act immediately.',
    stat: 'Decision-ready',
  },
];

const SECURITY_SIGNALS = [
  'Role-based access control',
  'Athlete-specific training records',
  'Plan-based feature access',
  'Privacy and terms pages included',
];

const CASE_STUDIES = [
  {
    title: 'Solo athlete progression',
    result: 'Sharper self-correction between coached sessions',
    detail: 'Personal plans combine live posture guidance, session logging, and AI coaching so athletes can improve between in-person reviews.',
  },
  {
    title: 'Academy operations',
    result: 'Less switching between coaching and admin tools',
    detail: 'Staff and academy admins share one workspace for student management, assigned sports, session history, and rule profiles.',
  },
  {
    title: 'Review workflow clarity',
    result: 'Faster post-session analysis',
    detail: 'Session records store notes, angles, rep counts, and highlights in a format that is easy to review and explain to athletes.',
  },
];

const IMPLEMENTATION_STEPS = [
  'Book a live walkthrough and confirm the right plan.',
  'Create athlete or academy accounts and assign sports.',
  'Start with live coaching, then build history and reporting over time.',
];

const PLAN_COMPARISON = [
  {
    feature: 'Live posture tracking',
    personal_basic: true,
    personal_pro: true,
    org_basic: true,
    org_pro: true,
  },
  {
    feature: 'Session scoring and history',
    personal_basic: true,
    personal_pro: true,
    org_basic: true,
    org_pro: true,
  },
  {
    feature: 'AI coach chat',
    personal_basic: false,
    personal_pro: true,
    org_basic: false,
    org_pro: true,
  },
  {
    feature: 'Athlete and staff management',
    personal_basic: false,
    personal_pro: false,
    org_basic: true,
    org_pro: true,
  },
  {
    feature: 'Advanced analytics and reporting',
    personal_basic: false,
    personal_pro: true,
    org_basic: false,
    org_pro: true,
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

const HERO_RELEASE_PROGRESS = 0.56;
const HERO_PRE_RELEASE_HOLD = 0.48;
const HERO_ARROW_ART_WIDTH = 92;
const HERO_ARROW_ART_HEIGHT = 24;
const HERO_ARROW_TIP_OFFSET = 46;
const HERO_ARROW_REST_X = 188;
const HERO_ARROW_REST_Y = 114;
const HERO_FLIGHT_DURATION_MIN = 4.8;
const HERO_FLIGHT_DURATION_MAX = 6.2;
const HERO_CELEBRATION_SPARKS = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  angle: index * (360 / 14),
}));

function HeroArrowSvg({ className = '', gradientId }) {
  return (
    <svg className={className} viewBox="0 0 92 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="2" y1="12" x2="88" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="0.55" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M2 12H72" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M68 4L90 12L68 20" fill="#f59e0b" />
      <path d="M14 6L2 12L14 18" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const randomBetween = (min, max) => min + Math.random() * (max - min);

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const buildHeroFlightPlan = (width, height, startPoint, impactPoint, arrowSize, duration) => {
  const clockwise = Math.random() > 0.5;
  const loops = randomBetween(2.4, 3.1);
  const orbitSteps = 16;
  const orbitCenter = {
    x: clampValue(width * randomBetween(0.36, 0.5), 190, width - 250),
    y: clampValue(height * randomBetween(0.34, 0.52), 150, height - 150),
  };
  const radiusX = Math.min(width * randomBetween(0.2, 0.28), 250);
  const radiusY = Math.min(height * randomBetween(0.18, 0.26), 190);
  const startAngle = randomBetween(-Math.PI, Math.PI);
  const orbitDirection = clockwise ? 1 : -1;
  const orbitPoints = Array.from({ length: orbitSteps }, (_, index) => {
    const progress = index / (orbitSteps - 1);
    const angle = startAngle + orbitDirection * progress * Math.PI * 2 * loops;
    const spiralFactor = 1 - progress * 0.34;
    const wobble = Math.sin(progress * Math.PI * 4) * 12;
    return {
      x: clampValue(
        orbitCenter.x + Math.cos(angle) * (radiusX * spiralFactor + wobble),
        96,
        width - 96
      ),
      y: clampValue(
        orbitCenter.y + Math.sin(angle) * (radiusY * spiralFactor + wobble * 0.85),
        96,
        height - 96
      ),
    };
  });
  const approachPoint = {
    x: clampValue(impactPoint.x - randomBetween(170, 240), 120, width - 120),
    y: clampValue(impactPoint.y + randomBetween(110, 190), 110, height - 110),
  };
  const tightenPointA = {
    x: clampValue(impactPoint.x - randomBetween(85, 135), 120, width - 100),
    y: clampValue(impactPoint.y - randomBetween(110, 155), 100, height - 100),
  };
  const tightenPointB = {
    x: clampValue(impactPoint.x + randomBetween(18, 54), 90, width - 80),
    y: clampValue(impactPoint.y - randomBetween(48, 88), 90, height - 90),
  };
  const tightenPointC = {
    x: clampValue(impactPoint.x - randomBetween(38, 72), 100, width - 80),
    y: clampValue(impactPoint.y + randomBetween(8, 36), 90, height - 80),
  };
  const finalAngle = Math.atan2(impactPoint.y - tightenPointC.y, impactPoint.x - tightenPointC.x);
  const landingPoint = {
    x: impactPoint.x - Math.cos(finalAngle) * (arrowSize.tipOffset ?? HERO_ARROW_TIP_OFFSET),
    y: impactPoint.y - Math.sin(finalAngle) * (arrowSize.tipOffset ?? HERO_ARROW_TIP_OFFSET),
  };

  const launchHoldA = { ...startPoint };
  const launchHoldB = { ...startPoint };
  const orbitStart = orbitPoints[0];
  const centerPoints = [launchHoldA, launchHoldB, startPoint, orbitStart, ...orbitPoints.slice(1), approachPoint, tightenPointA, tightenPointB, tightenPointC, landingPoint];
  const rotations = centerPoints.map((point, index) => {
    const nextPoint = centerPoints[index + 1] || centerPoints[index];
    return (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI;
  });
  const positionedPoints = centerPoints.map((point) => ({
    x: point.x - arrowSize.width / 2,
    y: point.y - arrowSize.height / 2,
  }));

  return {
    duration,
    impactPoint,
    arrowSize,
    points: positionedPoints,
    rotations,
    times: centerPoints.map((_, index) => {
      if (index === 0) return 0;
      if (index === 1) return HERO_PRE_RELEASE_HOLD;
      if (index === 2) return HERO_RELEASE_PROGRESS;
      return HERO_RELEASE_PROGRESS + ((index - 2) / (centerPoints.length - 3)) * (1 - HERO_RELEASE_PROGRESS);
    }),
    opacity: centerPoints.map((_, index) => {
      if (index < 2) return 0;
      if (index === centerPoints.length - 1) return 0;
      return 1;
    }),
  };
};

export default function Landing() {
  const [activeSection, setActiveSection] = useState('hero');
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState(FAQ_CATEGORIES[0]);
  const [heroFlight, setHeroFlight] = useState(null);
  const [flightCycle, setFlightCycle] = useState(0);
  const sectionRefs = useRef({});
  const observerRef = useRef(null);
  const targetRef = useRef(null);
  const archerRef = useRef(null);

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

  const filteredFaqs = useMemo(
    () => FAQS.filter((item) => item.category === activeCategory),
    [activeCategory]
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

  useEffect(() => {
    let timeoutId;

    const runFlightLoop = () => {
      const heroEl = sectionRefs.current.hero;
      const archerEl = archerRef.current;
      const targetEl = targetRef.current;
      if (!heroEl || !archerEl || !targetEl) {
        timeoutId = window.setTimeout(runFlightLoop, HERO_FLIGHT_DURATION_MIN * 1000);
        return;
      }

      const heroRect = heroEl.getBoundingClientRect();
      const archerRect = archerEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const arrowWidth = archerRect.width * (HERO_ARROW_ART_WIDTH / 420);
      const arrowHeight = archerRect.height * (HERO_ARROW_ART_HEIGHT / 320);
      const tipOffset = archerRect.width * (HERO_ARROW_TIP_OFFSET / 420);
      const duration = randomBetween(HERO_FLIGHT_DURATION_MIN, HERO_FLIGHT_DURATION_MAX);
      const startPoint = {
        x: archerRect.left - heroRect.left + archerRect.width * ((HERO_ARROW_REST_X + HERO_ARROW_ART_WIDTH / 2) / 420),
        y: archerRect.top - heroRect.top + archerRect.height * ((HERO_ARROW_REST_Y + HERO_ARROW_ART_HEIGHT / 2) / 320),
      };
      const impactPoint = {
        x: targetRect.left - heroRect.left + targetRect.width / 2,
        y: targetRect.top - heroRect.top + targetRect.height / 2,
      };

      setHeroFlight(
        buildHeroFlightPlan(
          heroRect.width,
          heroRect.height,
          startPoint,
          impactPoint,
          { width: arrowWidth, height: arrowHeight, tipOffset },
          duration
        )
      );
      setFlightCycle((prev) => prev + 1);
      timeoutId = window.setTimeout(runFlightLoop, duration * 1000);
    };

    const handleResize = () => {
      window.clearTimeout(timeoutId);
      runFlightLoop();
    };

    runFlightLoop();
    window.addEventListener('resize', handleResize);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
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

      <m.section
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
            <circle cx="100" cy="100" r="90" fill="rgba(61, 169, 252, 0.16)" />
            <circle cx="100" cy="100" r="60" fill="rgba(247, 201, 72, 0.18)" />
          </svg>
          <svg className="hero-ornament hero-ornament-right" viewBox="0 0 240 240">
            <path
              d="M32 40C88 12 152 4 208 32C232 44 236 84 208 108C152 156 92 188 40 208C16 216 4 196 12 176C32 124 44 88 32 40Z"
              fill="rgba(255, 127, 80, 0.14)"
            />
          </svg>
        </div>
        <div className="hero-flight-scene" aria-hidden="true">
          {heroFlight ? (
            <>
              <m.span
                key={`hero-flight-burst-${flightCycle}`}
                className="hero-flight-burst"
                style={{ left: heroFlight.impactPoint.x, top: heroFlight.impactPoint.y }}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{
                  opacity: [0, 0, 0, 1, 0.34, 0],
                  scale: [0.35, 0.35, 0.35, 1.08, 1.42, 1.82],
                }}
                transition={{
                  duration: heroFlight.duration,
                  times: [0, 0.76, 0.86, 0.91, 0.96, 1],
                  ease: 'easeOut',
                }}
              />
              <m.span
                key={`hero-flight-ring-${flightCycle}`}
                className="hero-flight-ring"
                style={{ left: heroFlight.impactPoint.x, top: heroFlight.impactPoint.y }}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 0, 1, 0.5, 0], scale: [0.35, 0.35, 1, 1.5, 1.9] }}
                transition={{
                  duration: heroFlight.duration,
                  times: [0, 0.84, 0.9, 0.96, 1],
                  ease: 'easeOut',
                }}
              />
              <div className="hero-flight-celebration" style={{ left: heroFlight.impactPoint.x, top: heroFlight.impactPoint.y }}>
                {HERO_CELEBRATION_SPARKS.map((spark) => (
                  <m.span
                    key={`hero-flight-spark-${flightCycle}-${spark.id}`}
                    className="hero-flight-spark"
                    style={{ '--spark-angle': `${spark.angle}deg` }}
                    initial={{ opacity: 0, scaleY: 0.25 }}
                    animate={{ opacity: [0, 0, 1, 0.7, 0], scaleY: [0.25, 0.25, 1, 1.15, 0.4] }}
                    transition={{
                      duration: heroFlight.duration,
                      times: [0, 0.86, 0.9, 0.95, 1],
                      ease: 'easeOut',
                      delay: spark.id * 0.01,
                    }}
                  />
                ))}
              </div>
              <m.div
                key={`hero-flight-arrow-${flightCycle}`}
                className="hero-flight-arrow-shell"
                style={{
                  width: heroFlight.arrowSize.width,
                  height: heroFlight.arrowSize.height,
                }}
                initial={{
                  x: heroFlight.points[0].x,
                  y: heroFlight.points[0].y,
                  rotate: heroFlight.rotations[0],
                  opacity: 0,
                }}
                animate={{
                  x: heroFlight.points.map((point) => point.x),
                  y: heroFlight.points.map((point) => point.y),
                  rotate: heroFlight.rotations,
                  opacity: heroFlight.opacity,
                }}
                transition={{
                  duration: heroFlight.duration,
                  times: heroFlight.times,
                  ease: 'linear',
                }}
              >
                <span className="hero-flight-trail" />
                <span className="hero-flight-flame" />
                <HeroArrowSvg className="hero-flight-arrow" gradientId={`hero-flight-arrow-stroke-${flightCycle}`} />
              </m.div>
            </>
          ) : null}
        </div>
        <div ref={targetRef} className="hero-target" aria-hidden="true">
          <svg viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="84" fill="rgba(255, 255, 255, 0.76)" stroke="rgba(15, 23, 42, 0.08)" strokeWidth="8" />
            <circle cx="90" cy="90" r="72" fill="#0f172a" opacity="0.08" />
            <circle cx="90" cy="90" r="60" fill="#0f172a" />
            <circle cx="90" cy="90" r="46" fill="#26c6da" />
            <circle cx="90" cy="90" r="32" fill="#ff7f50" />
            <circle cx="90" cy="90" r="18" fill="#ffd166" />
            <circle cx="90" cy="90" r="7" fill="#ffffff" />
            <path d="M90 14V38M90 142V166M14 90H38M142 90H166" stroke="rgba(15, 23, 42, 0.22)" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <m.span
            key={`hero-target-flash-${flightCycle}`}
            className="hero-target-flash"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0, 0.95, 0.32, 0], scale: [0.5, 0.5, 1.1, 1.45, 1.75] }}
            transition={{
              duration: heroFlight?.duration ?? HERO_FLIGHT_DURATION_MIN,
              times: [0, 0.86, 0.91, 0.96, 1],
              ease: 'easeOut',
            }}
          />
          <m.span
            key={`hero-target-ring-${flightCycle}`}
            className="hero-target-ring"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0, 1, 0.42, 0], scale: [0.3, 0.3, 1, 1.55, 1.95] }}
            transition={{
              duration: heroFlight?.duration ?? HERO_FLIGHT_DURATION_MIN,
              times: [0, 0.87, 0.92, 0.97, 1],
              ease: 'easeOut',
            }}
          />
        </div>
        <div
          key={`hero-archer-${flightCycle}`}
          ref={archerRef}
          className="hero-archer"
          style={{ '--hero-cycle-duration': `${heroFlight?.duration ?? HERO_FLIGHT_DURATION_MIN}s` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 420 320" fill="none">
            <defs>
              <linearGradient id="archerBodyGradient" x1="108" y1="92" x2="228" y2="218" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563eb" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="archerLegGradient" x1="120" y1="160" x2="208" y2="278" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0f172a" />
                <stop offset="1" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="archerBowGradient" x1="248" y1="48" x2="288" y2="210" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffd166" />
                <stop offset="1" stopColor="#ff7f50" />
              </linearGradient>
            </defs>
            <ellipse cx="164" cy="286" rx="124" ry="24" fill="rgba(15, 23, 42, 0.12)" />
            <path className="hero-archer-torso" d="M112 110C132 92 168 90 196 108L214 148C198 168 166 178 126 170L108 136Z" fill="url(#archerBodyGradient)" />
            <path d="M126 168C158 176 184 174 204 160L194 272H164L160 212L134 272H106L116 196Z" fill="url(#archerLegGradient)" />
            <circle className="hero-archer-head" cx="126" cy="78" r="24" fill="#ffd8c2" />
            <path d="M104 70C110 44 152 42 158 74C144 66 126 66 104 70Z" fill="#0f172a" />
            <path className="hero-archer-bow-arm" d="M150 146C186 152 220 146 252 132" stroke="#0f172a" strokeWidth="13" strokeLinecap="round" />
            <path className="hero-archer-draw-arm" d="M172 126C214 104 244 106 262 126" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" />
            <path d="M130 176L90 214" stroke="#0f172a" strokeWidth="13" strokeLinecap="round" />
            <path d="M178 176L214 214" stroke="#0f172a" strokeWidth="13" strokeLinecap="round" />
            <path className="hero-archer-bow" d="M286 56C322 108 322 152 286 206" stroke="url(#archerBowGradient)" strokeWidth="10" strokeLinecap="round" />
            <path className="hero-archer-bow-glow" d="M286 56C312 92 312 164 286 206" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
            <path className="hero-archer-string" d="M262 86C262 124 262 152 262 184" stroke="#fff7df" strokeWidth="2.5" strokeLinecap="round" />
            <g className="hero-archer-rest-arrow">
              <svg
                className="hero-archer-rest-arrow-svg"
                x={HERO_ARROW_REST_X}
                y={HERO_ARROW_REST_Y}
                width={HERO_ARROW_ART_WIDTH}
                height={HERO_ARROW_ART_HEIGHT}
                viewBox="0 0 92 24"
              >
                <defs>
                  <linearGradient id="hero-rest-arrow-stroke" x1="2" y1="12" x2="88" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1d4ed8" />
                    <stop offset="0.55" stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <path d="M2 12H72" stroke="url(#hero-rest-arrow-stroke)" strokeWidth="4" strokeLinecap="round" />
                <path d="M68 4L90 12L68 20" fill="#f59e0b" />
                <path d="M14 6L2 12L14 18" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </g>
            <circle cx="262" cy="126" r="5" fill="#0f172a" />
          </svg>
        </div>
        <m.div className="hero-copy" variants={stagger}>
          <m.span className="hero-chip" variants={fadeUp}>
            Edvatiq Performance Platform
          </m.span>
          <m.h2 variants={fadeUp}>
            Camera-first coaching that turns training into measurable progress.
          </m.h2>
          <m.p className="hero-subtitle" variants={fadeUp}>
            Edvatiq brings live posture intelligence, session scoring, and AI coaching together so every athlete
            knows exactly what to fix next.
          </m.p>
          <m.div className="hero-cta" variants={fadeUp}>
            <Link className="primary-button demo-button" to="/book-demo">
              Book a Demo <ArrowRight size={18} />
            </Link>
            <Link className="ghost-button" to="/pricing">View Plans</Link>
          </m.div>
          <m.div className="hero-proof" variants={fadeUp}>
            {HERO_BADGES.slice(0, 3).map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </m.div>
        </m.div>
        <m.div className="hero-media" variants={fadeUp}>
          <div className="hero-console">
            <div className="hero-console-head">
              <div>
                <span className="hero-console-kicker">Live session intelligence</span>
                <h3>Real-time coaching cockpit</h3>
              </div>
              <span className="hero-console-score">92/100</span>
            </div>
            <div className="hero-console-grid">
              <article className="hero-console-card accent">
                <p>Tracking Quality</p>
                <strong>96%</strong>
                <span>Full body locked</span>
              </article>
              <article className="hero-console-card">
                <p>Correction Focus</p>
                <strong>Draw Elbow</strong>
                <span>Raise 4 degrees</span>
              </article>
            </div>
            <div className="hero-console-chart">
              <div className="hero-console-chart-head">
                <span>Session score trend</span>
                <strong>+18%</strong>
              </div>
              <svg viewBox="0 0 320 132" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M0 98C24 100 30 92 52 88C76 82 92 72 116 76C136 78 154 62 174 56C196 48 218 60 240 46C264 32 286 18 320 22"
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d="M0 98C24 100 30 92 52 88C76 82 92 72 116 76C136 78 154 62 174 56C196 48 218 60 240 46C264 32 286 18 320 22"
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="240" cy="46" r="8" fill="#ff7f50" />
                <circle cx="240" cy="46" r="16" fill="rgba(255, 127, 80, 0.18)" />
                <circle cx="320" cy="22" r="8" fill="#ffd166" />
                <circle cx="320" cy="22" r="16" fill="rgba(255, 209, 102, 0.18)" />
              </svg>
            </div>
            <div className="hero-console-note">
              <span>AI Coach</span>
              <p>Anchor stays stable. Keep shoulders level through release for cleaner follow-through.</p>
            </div>
          </div>
          <div className="hero-float-card hero-float-card-left">
            <small>Best Rep</small>
            <strong>88 / 100</strong>
            <span>Balanced release</span>
          </div>
          <div className="hero-float-card hero-float-card-right">
            <small>Latency</small>
            <strong>34 ms</strong>
            <span>Live correction ready</span>
          </div>
        </m.div>
      </m.section>

      <m.section
        className="logo-strip landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeIn}
      >
        <p className="brand-kicker">Trusted by performance teams</p>
        <div className="marquee-shell logo-marquee" aria-label="Trusted by performance teams">
          <div className="marquee-track logo-track">
            {[...LOGO_STRIP, ...LOGO_STRIP].map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="logo-marquee-item"
                aria-hidden={index >= LOGO_STRIP.length}
              >
                <img src={logo.src} alt={index < LOGO_STRIP.length ? `${logo.name} logo` : ''} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </m.section>

      <m.section
        id="stats"
        ref={registerSection('stats')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Performance impact</span>
          <h3>Performance gains you can prove</h3>
          <p>See how Edvatiq accelerates training for athletes and teams.</p>
        </m.div>
        <m.div className="stat-strip" variants={stagger}>
          {STATS.map((stat) => (
            <m.div key={stat.label} className="stat-tile" variants={fadeUp}>
              <div className="stat-icon">{stat.icon}</div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </m.div>
          ))}
        </m.div>
      </m.section>

      <m.section
        id="features"
        ref={registerSection('features')}
        className="landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Product experience</span>
          <h3>Everything you need to coach better</h3>
          <p>Live intelligence, analytics, and operational tools in one system.</p>
        </m.div>
        <m.div className="split-stack" variants={stagger}>
          {FEATURE_STRIPS.map((item, index) => (
            <m.div key={item.title} className={`split-section ${index % 2 === 1 ? 'reverse' : ''}`} variants={fadeUp}>
              <div className="split-content split-panel">
                <div className="split-header">
                  <span className="split-index">0{index + 1}</span>
                  <span className="split-tag">{item.tag}</span>
                </div>
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
                <div className="split-actions">
                  <Link className="ghost-button" to="/book-demo">See it in action</Link>
                  <span className="split-note">Built to support live sessions, review, and planning.</span>
                </div>
              </div>
              <div className="split-media">
                <div className="split-media-overlay">
                  <span>{item.tag}</span>
                  <strong>{item.bullets[0]}</strong>
                </div>
                <div className={`feature-visual feature-visual-${index + 1}`} aria-hidden="true">
                  <div className="feature-visual-window">
                    <div className="feature-visual-topbar">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="feature-visual-body">
                      <div className="feature-visual-chart">
                        <span className="bar bar-1" />
                        <span className="bar bar-2" />
                        <span className="bar bar-3" />
                        <span className="bar bar-4" />
                      </div>
                      <div className="feature-visual-stack">
                        {item.metrics.map((metric) => (
                          <div key={metric} className="feature-visual-pill">{metric}</div>
                        ))}
                      </div>
                    </div>
                    <div className="feature-visual-footer">
                      <div className="feature-visual-line long" />
                      <div className="feature-visual-line short" />
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </m.div>
      </m.section>

      <m.section
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Trust and rollout</span>
          <h3>Built to feel credible before you even book a call</h3>
          <p>Professional teams expect operational clarity, security signals, and an easy path to deployment.</p>
        </m.div>
        <div className="trust-layout">
          <m.div className="trust-grid" variants={stagger}>
            {TRUST_PILLARS.map((item) => (
              <m.article key={item.title} className="trust-card" variants={fadeUp}>
                <span className="trust-stat">{item.stat}</span>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </m.article>
            ))}
          </m.div>
          <m.div className="trust-panel" variants={fadeUp}>
            <span className="section-kicker">Security posture</span>
            <h3>Core controls buyers look for are visible from day one.</h3>
            <ul className="split-list">
              {SECURITY_SIGNALS.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="trust-mini-grid">
              <article>
                <strong>Fast onboarding</strong>
                <p>Start with a single athlete or activate a full academy workspace.</p>
              </article>
              <article>
                <strong>Clear support path</strong>
                <p>Demo booking, support routing, and legal pages are already in place.</p>
              </article>
            </div>
          </m.div>
        </div>
      </m.section>

      <m.section
        id="platform"
        ref={registerSection('platform')}
        className="landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Operations layer</span>
          <h3>Built for performance operations</h3>
          <p>Edvatiq keeps every athlete, coach, and admin aligned in one workspace.</p>
        </m.div>
        <div className="platform-layout">
          <m.div className="platform-spotlight" variants={fadeUp}>
            <span className="section-kicker">Coach-facing workflow</span>
            <h3>From live capture to next-session planning without tool switching.</h3>
            <p className="hero-subtitle">
              Edvatiq connects technique review, athlete progress, and role-aware collaboration in a layout built
              for day-to-day coaching operations.
            </p>
            <div className="platform-steps">
              {PLATFORM_STEPS.map((step) => (
                <div key={step.title} className="platform-step">
                  <div className="feature-icon">{step.icon}</div>
                  <div>
                    <h4>{step.title}</h4>
                    <p className="hero-subtitle">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </m.div>
          <m.div className="capability-grid" variants={stagger}>
            {CAPABILITIES.map((item) => (
              <m.div key={item.title} className="capability-card" variants={fadeUp}>
                <div className="feature-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p className="hero-subtitle">{item.desc}</p>
              </m.div>
            ))}
          </m.div>
        </div>
      </m.section>

      <m.section
        id="testimonials"
        ref={registerSection('testimonials')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Social proof</span>
          <h3>Teams love the Edvatiq workflow</h3>
          <p>Performance staff and athletes rely on Edvatiq every day.</p>
        </m.div>
        <div className="marquee-shell testimonial-marquee" aria-label="Customer testimonials">
          <div className="marquee-track testimonial-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="testimonial-card testimonial-marquee-item"
                aria-hidden={index >= TESTIMONIALS.length}
              >
                <div className="testimonial-head">
                  <div className="testimonial-avatar">
                    <img src={item.avatar} alt={index < TESTIMONIALS.length ? item.name : ''} loading="lazy" onError={handleImageError} />
                    <div>
                      <strong>{item.name}</strong>
                      <div className="hero-subtitle">{item.role}</div>
                    </div>
                  </div>
                  <div className="testimonial-stars">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={`${item.name}-star-${idx}-${index}`} size={16} />
                    ))}
                  </div>
                </div>
                <p>"{item.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </m.section>

      <m.section
        className="landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Buyer confidence</span>
          <h3>Why teams upgrade beyond basic coaching tools</h3>
          <p>Edvatiq combines coaching execution, athlete review, and operations in one environment.</p>
        </m.div>
        <m.div className="case-study-grid" variants={stagger}>
          {CASE_STUDIES.map((item) => (
            <m.article key={item.title} className="case-study-card" variants={fadeUp}>
              <span className="case-study-label">Use case</span>
              <h4>{item.title}</h4>
              <strong>{item.result}</strong>
              <p>{item.detail}</p>
            </m.article>
          ))}
        </m.div>
      </m.section>

      <m.section
        id="plans"
        ref={registerSection('plans')}
        className="plans-section landing-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">Pricing</span>
          <h3>Plans for every scale</h3>
          <p>Start personal or equip a full academy in minutes.</p>
        </m.div>
        <m.div className="plans-grid" variants={stagger}>
          {plans.map((plan, index) => (
            <m.article
              key={plan.code || plan.name}
              className={`plan-card ${index === 1 ? 'featured' : ''}`}
              variants={fadeUp}
            >
              <div>
                {index === 1 ? <span className="plan-badge">Most popular</span> : null}
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
            </m.article>
          ))}
        </m.div>
        <m.div className="plan-compare-card" variants={fadeUp}>
          <div className="section-head compact">
            <span className="section-kicker">Compare plans</span>
            <h3>See what changes as you scale</h3>
          </div>
          <div className="plan-compare-table">
            <div className="plan-compare-head">
              <span>Capability</span>
              <span>Personal Basic</span>
              <span>Personal Pro</span>
              <span>Org Basic</span>
              <span>Org Pro</span>
            </div>
            {PLAN_COMPARISON.map((row) => (
              <div key={row.feature} className="plan-compare-row">
                <span>{row.feature}</span>
                <span>{row.personal_basic ? 'Included' : '-'}</span>
                <span>{row.personal_pro ? 'Included' : '-'}</span>
                <span>{row.org_basic ? 'Included' : '-'}</span>
                <span>{row.org_pro ? 'Included' : '-'}</span>
              </div>
            ))}
          </div>
        </m.div>
      </m.section>

      <m.section
        id="faq"
        ref={registerSection('faq')}
        className="landing-section section-soft"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger}
      >
        <m.div className="section-head" variants={fadeUp}>
          <span className="section-kicker">FAQ</span>
          <h3>Frequently asked questions</h3>
          <p>Need more details? We are ready to walk you through it.</p>
        </m.div>
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
          <m.div className="faq-accordions" variants={stagger}>
            {filteredFaqs.map((item) => {
              const isOpen = openFaq === item.q;
              return (
                <m.div key={item.q} className="faq-item" variants={fadeUp}>
                  <button
                    type="button"
                    className={`faq-trigger ${isOpen ? 'open' : ''}`}
                    onClick={() => setOpenFaq(isOpen ? null : item.q)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-icon">{isOpen ? '-' : '+'}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <m.div
                        className="faq-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      >
                        <p className="hero-subtitle">{item.a}</p>
                      </m.div>
                    ) : null}
                  </AnimatePresence>
                </m.div>
              );
            })}
          </m.div>
        </div>
      </m.section>

      <m.section
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
          <ul className="cta-checklist">
            {IMPLEMENTATION_STEPS.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cta-actions">
          <Link className="primary-button demo-button" to="/book-demo">Book a Demo</Link>
          <Link className="ghost-button" to="/signup?plan=personal_basic">Start Personal</Link>
        </div>
      </m.section>

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


