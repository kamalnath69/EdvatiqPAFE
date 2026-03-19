const DEFAULT_POLICY = {
  minRequestIntervalMs: 20000,
  fullscreenSuspendMs: 1800,
  scoreBucketSize: 10,
  repMilestoneSize: 3,
  feedbackLimit: 3,
};

const SPORT_POLICIES = {
  archery: {
    minRequestIntervalMs: 22000,
    fullscreenSuspendMs: 2200,
    scoreBucketSize: 8,
    repMilestoneSize: 2,
    feedbackLimit: 3,
  },
  'cricket bowling': {
    minRequestIntervalMs: 24000,
    fullscreenSuspendMs: 2200,
    scoreBucketSize: 10,
    repMilestoneSize: 1,
    feedbackLimit: 3,
  },
  squat: {
    minRequestIntervalMs: 18000,
    fullscreenSuspendMs: 1800,
    scoreBucketSize: 10,
    repMilestoneSize: 2,
    feedbackLimit: 2,
  },
  'tennis serve': {
    minRequestIntervalMs: 24000,
    fullscreenSuspendMs: 2200,
    scoreBucketSize: 8,
    repMilestoneSize: 1,
    feedbackLimit: 3,
  },
};

const FEEDBACK_CATEGORY_RULES = [
  { pattern: /shoulder|bow shoulder/i, key: 'shoulder_alignment' },
  { pattern: /spine|tall|posture/i, key: 'spine_posture' },
  { pattern: /hip|square|level/i, key: 'hip_alignment' },
  { pattern: /knee|stance|feet|balance/i, key: 'lower_body_balance' },
  { pattern: /head|chin|neck/i, key: 'head_position' },
  { pattern: /anchor|release|follow through|follow-through/i, key: 'release_mechanics' },
  { pattern: /lighting|frame|tracking|visible|closer|step back|recenter/i, key: 'camera_setup' },
  { pattern: /elbow|arm/i, key: 'arm_path' },
];

export function normalizeSportName(sport) {
  return String(sport || '').trim().toLowerCase();
}

export function getLiveCoachPolicy(sport) {
  return {
    ...DEFAULT_POLICY,
    ...(SPORT_POLICIES[normalizeSportName(sport)] || {}),
  };
}

function normalizeFeedbackItem(item) {
  const text = String(item || '')
    .trim()
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, '#')
    .replace(/\s+/g, ' ');
  if (!text) return '';
  const matched = FEEDBACK_CATEGORY_RULES.find((rule) => rule.pattern.test(text));
  return matched?.key || text.slice(0, 48);
}

export function createGuidanceSignal({
  sport,
  student,
  feedback = [],
  sessionScore = null,
  phase = '',
  repCount = null,
  trackingQuality = '',
}) {
  const policy = getLiveCoachPolicy(sport);
  const categories = Array.from(
    new Set(
      feedback
        .map(normalizeFeedbackItem)
        .filter(Boolean)
    )
  )
    .sort()
    .slice(0, policy.feedbackLimit);

  const scoreBucket =
    sessionScore == null || Number.isNaN(Number(sessionScore))
      ? 'na'
      : Math.round(Number(sessionScore) / policy.scoreBucketSize) * policy.scoreBucketSize;

  const repMilestone =
    repCount == null || Number.isNaN(Number(repCount))
      ? 0
      : Math.floor(Number(repCount) / policy.repMilestoneSize);

  const tracking = String(trackingQuality || '').trim().toLowerCase() || 'unknown';
  const safePhase = String(phase || '').trim().toLowerCase() || 'unknown';

  const key = JSON.stringify({
    sport: normalizeSportName(sport),
    student: String(student || '').trim().toLowerCase(),
    categories,
    scoreBucket,
    phase: safePhase,
    repMilestone,
    tracking,
  });

  return {
    key,
    categories,
    scoreBucket,
    phase: safePhase,
    repMilestone,
    tracking,
    policy,
  };
}
