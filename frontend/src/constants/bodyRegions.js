// SVG coords use viewBox="0 0 200 450" front-facing silhouette
export const BODY_REGIONS = {
  head: {
    label: 'Head',
    svg: { cx: 100, cy: 42, rx: 28, ry: 30 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none&ui-fullscreen=false',
    color: '#38bdf8',
    conditions: ['Tension headache', 'Migraine', 'Sinusitis', 'Concussion'],
    narrative: 'The head houses your brain, sensory organs, and countless nerve pathways.',
  },
  neck: {
    label: 'Neck',
    svg: { cx: 100, cy: 82, rx: 14, ry: 12 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#60a5fa',
    conditions: ['Muscle strain', 'Cervical disc issue', 'Whiplash'],
    narrative: 'Your neck connects your brain to the rest of your body through the cervical spine.',
  },
  chest: {
    label: 'Chest',
    svg: { cx: 100, cy: 130, rx: 44, ry: 32 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=5qNT&ui-panel=none',
    color: '#f87171',
    conditions: ['Muscle strain', 'Costochondritis', 'GERD', 'Anxiety'],
    narrative: 'The chest contains your heart and lungs — vital organs protected by the rib cage.',
    isHighRisk: true,
  },
  abdomen: {
    label: 'Abdomen',
    svg: { cx: 100, cy: 192, rx: 40, ry: 34 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=5qNS&ui-panel=none',
    color: '#fb923c',
    conditions: ['IBS', 'Gastritis', 'Hernia', 'Appendicitis'],
    narrative: 'Your abdomen houses most of your digestive organs, including your stomach, intestines, and liver.',
  },
  lower_back: {
    label: 'Lower Back',
    svg: { cx: 100, cy: 195, rx: 44, ry: 34 },
    view: 'back',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#a78bfa',
    conditions: ['Lumbar strain', 'Disc herniation', 'Sciatica', 'Spondylosis'],
    narrative: 'The lumbar region of your spine bears most of your body weight and enables bending and twisting.',
  },
  upper_back: {
    label: 'Upper Back',
    svg: { cx: 100, cy: 130, rx: 44, ry: 32 },
    view: 'back',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#60a5fa',
    conditions: ['Muscle tension', 'Poor posture', 'Thoracic disc issue'],
    narrative: 'Your upper back, or thoracic spine, is stabilized by your rib cage and supports posture.',
  },
  left_arm: {
    label: 'Left Arm',
    svg: { cx: 38, cy: 170, rx: 16, ry: 38 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#34d399',
    conditions: ['Rotator cuff', 'Tennis elbow', 'Carpal tunnel'],
    narrative: 'Your arm contains three major bones and a network of muscles that enable fine motor control.',
  },
  right_arm: {
    label: 'Right Arm',
    svg: { cx: 162, cy: 170, rx: 16, ry: 38 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#34d399',
    conditions: ['Rotator cuff', 'Tennis elbow', 'Carpal tunnel'],
    narrative: 'Your arm contains three major bones and a network of muscles that enable fine motor control.',
  },
  left_leg: {
    label: 'Left Leg',
    svg: { cx: 72, cy: 320, rx: 22, ry: 62 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#fbbf24',
    conditions: ["Runner's knee", 'Shin splints', 'Sciatica', 'Plantar fasciitis'],
    narrative: 'Your leg is your body\'s primary support structure, designed to carry your weight across many terrains.',
  },
  right_leg: {
    label: 'Right Leg',
    svg: { cx: 128, cy: 320, rx: 22, ry: 62 },
    view: 'front',
    biodigitalUrl: 'https://human.biodigital.com/viewer/?id=production/maleAdult&ui-panel=none',
    color: '#fbbf24',
    conditions: ["Runner's knee", 'Shin splints', 'Sciatica', 'Plantar fasciitis'],
    narrative: 'Your leg is your body\'s primary support structure, designed to carry your weight across many terrains.',
  },
}

export const REGION_KEYS = Object.keys(BODY_REGIONS)

// Keyword-based fallback mapping (used when Claude is unavailable)
export function guessRegion(text) {
  const t = text.toLowerCase()
  if (/head|skull|temple|forehead|scalp|migraine/.test(t)) return 'head'
  if (/neck|throat|cervical/.test(t))                       return 'neck'
  if (/chest|heart|lung|sternum|rib|pec/.test(t))           return 'chest'
  if (/stomach|belly|abdomen|gut|nausea|digest/.test(t))    return 'abdomen'
  if (/lower back|lumbar|sacrum|pelvis|hip/.test(t))        return 'lower_back'
  if (/upper back|shoulder blade|thoracic/.test(t))         return 'upper_back'
  if (/left arm|left elbow|left wrist|left shoulder/.test(t)) return 'left_arm'
  if (/right arm|right elbow|right wrist|right shoulder/.test(t)) return 'right_arm'
  if (/left leg|left knee|left ankle|left foot/.test(t))    return 'left_leg'
  if (/right leg|right knee|right ankle|right foot/.test(t)) return 'right_leg'
  if (/leg|knee|ankle|foot|feet|shin|calf/.test(t))          return 'right_leg'
  if (/arm|shoulder|elbow|wrist|hand/.test(t))               return 'right_arm'
  if (/back/.test(t))                                        return 'lower_back'
  return 'lower_back'
}
