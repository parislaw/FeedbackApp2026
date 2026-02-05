
import { Scenario, Role, Difficulty } from './types';

export const PERSONAS = {
  DEFENSIVE_DEREK: {
    id: 'defensive-derek',
    name: 'Defensive Derek',
    roleDescription: 'A software engineer who justifies everything and deflects blame.',
    difficulty: Difficulty.Medium,
    characteristics: ['Justifies mistakes', 'Blames QA or Product', 'Takes things personally'],
  },
  CONFUSED_CARLA: {
    id: 'confused-carla',
    name: 'Confused Carla',
    roleDescription: 'A developer who is genuinely unclear on expectations and standards.',
    difficulty: Difficulty.Easy,
    characteristics: ['Asks many questions', 'Needs explicit standards', 'Open but lost'],
  },
  OPEN_OLIVIA: {
    id: 'open-olivia',
    name: 'Open Olivia',
    roleDescription: 'A high-performer who is receptive and reflective.',
    difficulty: Difficulty.Easy,
    characteristics: ['Receptive', 'Takes ownership', 'Asks for support'],
  }
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'missed-deadlines',
    title: 'Missed Deadlines',
    description: 'A teammate missed the last two sprint commitments, causing delays.',
    role: Role.Giver,
    context: 'You are a Tech Lead. Your goal is to give feedback that clarifies expectations, grounds your assessment in concrete examples, and lands a realistic next step.',
    persona: PERSONAS.DEFENSIVE_DEREK,
  },
  {
    id: 'code-quality',
    title: 'Code Quality Issues',
    description: 'Code reviews show a pattern of sloppy logic and missing unit tests.',
    role: Role.Giver,
    context: 'You are a Senior Engineer. Your peer has been pushing PRs with significant regressions. Address the standard for code quality and testing.',
    persona: PERSONAS.CONFUSED_CARLA,
  },
  {
    id: 'positive-reinforcement',
    title: 'Positive Reinforcement',
    description: 'A teammate handled a critical production incident exceptionally well.',
    role: Role.Giver,
    context: 'A mid-level developer stayed late and communicated perfectly during a fire. Ground your positive assessment to ensure the behavior continues.',
    persona: PERSONAS.OPEN_OLIVIA,
  }
];

export const RUBRIC_DIMENSIONS = [
  'Standard clarity',
  'Specificity of assertions',
  'Quality of grounding',
  'Impact articulation',
  'Emotional regulation',
  'Commitment quality'
];
