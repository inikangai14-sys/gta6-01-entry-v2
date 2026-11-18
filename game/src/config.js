// Solmar Bay: Night Shift — world constants, the six-job story chain and the
// endless courier gigs. Everything the other systems share lives here so the
// city, the missions and the minimap always agree on the same map.

export const WORLD = {
  half: 220, // city spans -220..220 on x and z
  roadGap: 40, // avenues and streets every 40 units
  roadWidth: 10,
  sidewalk: 3,
  beachZ: 205, // sand starts here
  oceanZ: 235, // water starts here
  seedDefault: 7,
};

// Landmarks the jobs, the beacon and the minimap all point at.
export const LANDMARKS = {
  plaza: { x: 0, z: 0, label: 'Solmar Plaza' },
  marina: { x: 200, z: 160, label: 'Marina' },
  pier: { x: 0, z: 214, label: 'Pier' },
  warehouse: { x: -160, z: 160, label: 'Harbor Warehouse' },
  hideout: { x: -120, z: -80, label: 'Coral Row Hideout' },
  bank: { x: 80, z: -40, label: 'Bay Bank' },
  safehouse: { x: 160, z: -160, label: 'Safehouse' },
  hospital: { x: -40, z: 120, label: 'St. Marina Hospital' },
  club: { x: 120, z: 80, label: 'Neon Palms' },
  ferris: { x: -60, z: 214, label: 'Ferris Wheel' },
};

// The story chain: six night jobs from Mara. Each job has two legs — go to
// the pickup, then carry it to the drop — a countdown and a payout.
export const JOBS = [
  {
    id: 'fare',
    title: 'JOB 1 — FIRST FARE',
    brief: 'Mara: "A client waits at the Marina. Pick him up and bring him to Solmar Plaza. Quick and quiet."',
    pickup: 'marina',
    drop: 'plaza',
    time: 95,
    payout: 300,
    wanted: 0,
  },
  {
    id: 'package',
    title: 'JOB 2 — PIER PACKAGE',
    brief: 'Mara: "A package is stashed under the Pier. Grab it, then run it to the Harbor Warehouse. Don\'t open it."',
    pickup: 'pier',
    drop: 'warehouse',
    time: 110,
    payout: 450,
    wanted: 0,
  },
  {
    id: 'rico',
    title: 'JOB 3 — RICO\'S RIDE',
    brief: 'Rico: "I\'m at the Plaza and the cops are sniffing around. Get me to Coral Row — and drive like you mean it."',
    pickup: 'plaza',
    drop: 'hideout',
    time: 120,
    payout: 600,
    wanted: 2,
  },
  {
    id: 'heat',
    title: 'JOB 4 — HARBOR HEAT',
    brief: 'Mara: "Three stars on you the moment you start the car. Shake the tail, then meet the crew at the Warehouse."',
    pickup: 'hideout',
    drop: 'warehouse',
    time: 150,
    payout: 800,
    wanted: 3,
  },
  {
    id: 'score',
    title: 'JOB 5 — THE BIG SCORE',
    brief: 'Mara: "Bay Bank, then the Safehouse. The car is hot, the money is hotter. Two legs, one clean run."',
    pickup: 'bank',
    drop: 'safehouse',
    time: 180,
    payout: 1500,
    wanted: 2,
  },
  {
    id: 'slate',
    title: 'JOB 6 — CLEAN SLATE',
    brief: 'Mara: "Last one. Cross the whole city to the Neon Palms and this is over. A clean slate, Jay. Earn it."',
    pickup: 'safehouse',
    drop: 'club',
    time: 200,
    payout: 2500,
    wanted: 0,
  },
];

// Endless courier gigs once the chain is done: random landmark pairs,
// short clocks, smaller payouts. The mission loop never runs dry.
export const GIG_NAMES = [
  'Courier Run',
  'Late-Night Delivery',
  'Bay Express',
  'Hot Package',
  'Midnight Fare',
];

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10.5,
  jumpSpeed: 8,
  gravity: 22,
  radius: 0.9,
  maxHealth: 100,
  startCash: 120,
  startAmmo: 12,
  maxAmmo: 12,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseMax: 12,
  maxSpeed: 38,
  steer: 1.9,
  handbrakeGrip: 0.35,
};

export const POLICE = {
  maxStars: 5,
  decaySeconds: 14, // out of sight this long and one star fades
  ramDamage: 8,
  officerDamage: 6,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;
export const CLOCK_START_HOUR = 17.66; // 17:40, golden hour
export const CLOCK_MINUTES_PER_SECOND = 0.35; // a full day in ~68 real minutes
