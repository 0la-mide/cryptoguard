// Plain-English definitions for every technical term in the app.
// `like` is an everyday analogy; keep both short enough to read aloud.

export type GlossaryEntry = { term: string; plain: string; like?: string; group: GlossaryGroup }
export type GlossaryGroup = 'The attack' | 'The defense' | 'Who attacks' | 'The statistics'

export const GLOSSARY = {
  timingAttack: {
    group: 'The attack',
    term: 'Timing attack',
    plain: 'Stealing a secret by measuring how long a computer takes to do something, instead of breaking the encryption itself.',
    like: 'Guessing a password because the website takes a tiny bit longer to reject guesses that start with the right letters.',
  },
  sideChannel: {
    group: 'The attack',
    term: 'Side channel',
    plain: 'Information that leaks out by accident, through time taken, power used or sound made, rather than through the data itself.',
    like: 'Listening to the clicks of a safe\'s dial instead of knowing the combination.',
  },
  cryptography: {
    group: 'The attack',
    term: 'Cryptography',
    plain: 'The maths used to keep information secret, such as encryption.',
  },
  secretBit: {
    group: 'The attack',
    term: 'Secret bit',
    plain: 'One digit (0 or 1) of a secret key. A key is made of thousands of these. Learn them one by one and you have the whole key.',
  },
  cryptoOp: {
    group: 'The attack',
    term: 'Crypto operation',
    plain: 'One run of the secret task (for example, encrypting a message) that uses the key.',
  },
  raw: {
    group: 'The attack',
    term: 'Raw timing',
    plain: 'How long the task really took inside the server, before any defense touches it. The attacker can\'t see this directly.',
  },
  tObs: {
    group: 'The attack',
    term: 'T_obs (observed time)',
    plain: 'The response time the attacker can actually measure from outside. "obs" is short for observed.',
    like: 'The time on the attacker\'s stopwatch.',
  },
  gap: {
    group: 'The attack',
    term: 'Gap',
    plain: 'The difference between the average time for bit-0 operations and bit-1 operations. If the attacker can see a gap, that\'s the leak.',
  },
  threshold: {
    group: 'The attack',
    term: 'Leakage threshold',
    plain: 'The largest gap we accept as safe. Here it\'s 4.5 milliseconds unless you change it.',
  },
  iir: {
    group: 'The defense',
    term: 'IIR filter',
    plain: 'A running average. Each new timing is blended into the average so far, so one unusual value only nudges it. IIR stands for "Infinite Impulse Response": every past value keeps a small, fading influence forever.',
    like: 'Your running grade average: one bad test moves it a little, not all the way.',
  },
  alpha: {
    group: 'The defense',
    term: 'α (alpha)',
    plain: 'The smoothing knob of the running average. Small α trusts the history (smooth but slow to react). Large α trusts the newest value (quick to react).',
  },
  ema: {
    group: 'The defense',
    term: 'Exponential moving average',
    plain: 'Another name for this kind of running average: recent values count most, and older ones fade away gradually.',
  },
  lowPass: {
    group: 'The defense',
    term: 'Low-pass filter',
    plain: 'Something that keeps slow, steady trends and removes quick jumps.',
    like: 'Shock absorbers on a car: you feel the hill, not every pebble.',
  },
  pid: {
    group: 'The defense',
    term: 'PID controller',
    plain: 'An automatic adjuster that keeps a value close to a target. Here it adds extra delay to push response times toward a target time. PID stands for Proportional, Integral, Derivative: its three ways of reacting.',
    like: 'Cruise control, which presses the accelerator harder the further the car is below the set speed.',
  },
  kp: {
    group: 'The defense',
    term: 'Kp (proportional gain)',
    plain: 'How strongly the controller reacts to how far off target it is right now.',
  },
  ki: {
    group: 'The defense',
    term: 'Ki (integral gain)',
    plain: 'How strongly the controller reacts to error that has built up over time. Think of it as the controller\'s memory.',
  },
  kd: {
    group: 'The defense',
    term: 'Kd (derivative gain)',
    plain: 'How strongly the controller reacts to how fast the error is changing, which stops it overshooting.',
  },
  setpoint: {
    group: 'The defense',
    term: 'Setpoint (T_ref)',
    plain: 'The target the controller aims for. Here, the response time every operation should appear to take. "ref" means reference.',
  },
  error: {
    group: 'The defense',
    term: 'Error (e)',
    plain: 'The difference between the target and the current value. The controller\'s whole job is to shrink it.',
  },
  feedback: {
    group: 'The defense',
    term: 'Feedback loop',
    plain: 'When a system checks its own output and uses it to adjust what it does next.',
    like: 'A thermostat checking the room temperature before switching the heater on or off.',
  },
  wcet: {
    group: 'The defense',
    term: 'WCET (worst-case execution time)',
    plain: 'The longest the task could ever take.',
  },
  wcetPadding: {
    group: 'The defense',
    term: 'WCET padding',
    plain: 'Making every response wait until the worst-case time, so fast and slow operations look identical from outside.',
    like: 'Nobody may leave the exam hall before the bell, so you can\'t tell who finished first.',
  },
  overrun: {
    group: 'The defense',
    term: 'Overrun',
    plain: 'An operation that takes longer than the WCET deadline. It can\'t be padded, so its real timing leaks.',
  },
  latency: {
    group: 'The defense',
    term: 'Latency',
    plain: 'Delay: how long you wait for a response.',
  },
  deterministic: {
    group: 'The defense',
    term: 'Deterministic',
    plain: 'Guaranteed to behave the same way every time, with no luck involved.',
  },
  probabilistic: {
    group: 'The defense',
    term: 'Probabilistic defense',
    plain: 'A defense that only makes a leak unlikely to be noticed, by hiding it in randomness. With enough measurements, an attacker can average the randomness away.',
  },
  noiseInjection: {
    group: 'The defense',
    term: 'Noise injection',
    plain: 'A defense that adds random delays to hide the real timing. It helps, but averaging many measurements cancels random noise out.',
  },
  threatModel: {
    group: 'Who attacks',
    term: 'Threat model',
    plain: 'A description of who the attacker is and what they can see or do. A defense is only "secure" against a particular threat model.',
  },
  external: {
    group: 'Who attacks',
    term: 'External attacker',
    plain: 'Someone outside the network, timing responses over the internet. They see fewer responses, blurred by network delays.',
  },
  rogueNode: {
    group: 'Who attacks',
    term: 'Rogue node',
    plain: 'A device inside the network that has been hacked or is secretly malicious. Being inside, it can time every operation up close.',
    like: 'A spy sitting inside the building instead of watching from across the street.',
  },
  manet: {
    group: 'Who attacks',
    term: 'MANET',
    plain: 'Mobile Ad-hoc NETwork: devices (phones, drones, sensors) that connect directly to each other with no central router and pass messages along.',
  },
  jitter: {
    group: 'Who attacks',
    term: 'Network jitter',
    plain: 'Random variation in how long messages take to travel across a network. It blurs an outsider\'s measurements.',
  },
  noise: {
    group: 'The statistics',
    term: 'Noise',
    plain: 'Random variation that has nothing to do with the secret.',
  },
  samples: {
    group: 'The statistics',
    term: 'Samples',
    plain: 'Individual measurements. More samples means more evidence.',
  },
  averaging: {
    group: 'The statistics',
    term: 'Statistical averaging',
    plain: 'Taking many measurements and averaging them. Random noise cancels out, while a consistent difference remains.',
    like: 'One blurry photo hides a face. Stack a thousand blurry photos and the face appears.',
  },
  histogram: {
    group: 'The statistics',
    term: 'Histogram',
    plain: 'A bar chart showing how often each time value occurred. Two separate humps mean two clearly different groups.',
  },
  tTest: {
    group: 'The statistics',
    term: "Welch's t-test",
    plain: 'A standard statistics test that asks: are these two groups really different, or could the difference just be luck? Welch\'s version works even when the groups are spread out by different amounts.',
  },
  pValue: {
    group: 'The statistics',
    term: 'p-value',
    plain: 'The chance of seeing a difference this big purely by luck. A tiny p-value (0.001 means 1 in 1,000) means the difference is almost certainly real.',
  },
  tStat: {
    group: 'The statistics',
    term: 't-statistic',
    plain: 'How big the difference between the groups is compared with their random spread. The further from zero, the clearer the difference.',
  },
  distinguishable: {
    group: 'The statistics',
    term: 'Distinguishable',
    plain: 'The attacker can reliably tell bit-0 operations from bit-1 operations. In other words, the secret leaks.',
  },
} satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY

export const GLOSSARY_GROUPS: GlossaryGroup[] = ['The attack', 'The defense', 'Who attacks', 'The statistics']
