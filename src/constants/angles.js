export const ANGLE_METRICS = [
  { id: 'left_elbow', label: 'Left elbow', step: 0.01 },
  { id: 'right_elbow', label: 'Right elbow', step: 0.01 },
  { id: 'shoulders', label: 'Shoulders', step: 0.01 },
  { id: 'spine', label: 'Spine', step: 0.01 },
  { id: 'hip_level', label: 'Hip level', step: 0.01 },
  { id: 'stance_width', label: 'Stance width', step: 0.01 },
  { id: 'left_knee_posture', label: 'Left knee posture', step: 0.01 },
  { id: 'right_knee_posture', label: 'Right knee posture', step: 0.01 },
  { id: 'head_alignment', label: 'Head alignment', step: 0.01 },
  { id: 'neck_tilt', label: 'Neck tilt', step: 0.01 },
];

const ID_TO_LABEL = ANGLE_METRICS.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const LABEL_TO_ID = ANGLE_METRICS.reduce((acc, item) => {
  acc[item.label] = item.id;
  return acc;
}, {});

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function createAngleFormDefaults(seed = null) {
  const defaults = {};
  ANGLE_METRICS.forEach((item) => {
    defaults[item.id] = '';
  });
  if (!seed || typeof seed !== 'object') return defaults;
  Object.entries(seed).forEach(([key, value]) => {
    const id = LABEL_TO_ID[key] || key;
    if (id in defaults) defaults[id] = String(value ?? '');
  });
  return defaults;
}

export function formAnglesToLabeledMap(formValues) {
  const result = {};
  Object.entries(formValues || {}).forEach(([id, value]) => {
    const parsed = toNumberOrNull(value);
    if (parsed === null) return;
    const label = ID_TO_LABEL[id] || id;
    result[label] = parsed;
  });
  return result;
}

export function extractRuleTargetsForForm(rules) {
  if (!rules || typeof rules !== 'object') return createAngleFormDefaults();
  if (rules.targets && typeof rules.targets === 'object') {
    return createAngleFormDefaults(rules.targets);
  }
  return createAngleFormDefaults(rules);
}

export function extractRuleToleranceForForm(rules) {
  const defaults = {};
  ANGLE_METRICS.forEach((item) => {
    defaults[item.id] = '';
  });
  if (!rules || typeof rules !== 'object') return defaults;
  const tolerance = rules.tolerances;
  if (!tolerance || typeof tolerance !== 'object') return defaults;
  Object.entries(tolerance).forEach(([key, value]) => {
    const id = LABEL_TO_ID[key] || key;
    if (id in defaults) defaults[id] = String(value ?? '');
  });
  return defaults;
}

