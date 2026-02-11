
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
  },
  OVERCONFIDENT_OSCAR: {
    id: 'overconfident-oscar',
    name: 'Overconfident Oscar',
    roleDescription: 'A senior engineer and top performer who dismisses feedback and uses past wins as deflection.',
    difficulty: Difficulty.Hard,
    characteristics: ['Dismisses critical feedback', 'Uses past wins as shield', 'Subtly hostile when challenged', 'Uses sarcasm as armor', 'Undermines junior teammates'],
  },
  CHECKED_OUT_CHRIS: {
    id: 'checked-out-chris',
    name: 'Checked-Out Chris',
    roleDescription: 'A mid-level engineer who was once a strong contributor but is now disengaged.',
    difficulty: Difficulty.Medium,
    characteristics: ['Provides minimal responses', 'Avoids eye contact', 'Low-energy communication', 'Once-strong contributor', 'Declining participation'],
  }
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'missed-deadlines',
    title: 'Missed Deadlines',
    description: 'A teammate missed the last two sprint commitments, causing delays.',
    role: Role.Giver,
    context: 'You are a Tech Lead. Your goal is to give feedback that clarifies expectations, grounds your assessment in concrete examples, and lands a realistic next step.',
    assertions: [
      'Sprint DEV-47 commitment: 8 story points — only 3 delivered, 5 carried over',
      'DEV-231 was marked done in standup on Friday; PR wasn\'t submitted until Tuesday',
      'Second consecutive sprint with incomplete commitments (Q3 Sprint 4 and Sprint 5)',
      'Two teammates had to delay their integration work due to the late handoff'
    ],
    persona: PERSONAS.DEFENSIVE_DEREK,
  },
  {
    id: 'code-quality',
    title: 'Code Quality Issues',
    description: 'Code reviews show a pattern of sloppy logic and missing unit tests.',
    role: Role.Giver,
    context: 'You are a Senior Engineer. Your peer has been pushing PRs with significant regressions. Address the standard for code quality and testing.',
    assertions: [
      'PR #142 was merged with 2 regressions caught in QA — both null-check failures on the user object',
      'PR #138 had 34% test coverage on new code; team standard is 80%',
      '3 of Carla\'s last 4 PRs required more than 2 review rounds before approval',
      'Last Friday\'s deploy was delayed 2 hours due to a bug in her feature that broke the auth flow'
    ],
    persona: PERSONAS.CONFUSED_CARLA,
  },
  {
    id: 'positive-reinforcement',
    title: 'Positive Reinforcement',
    description: 'A teammate handled a critical production incident exceptionally well.',
    role: Role.Giver,
    context: 'A mid-level developer stayed late and communicated perfectly during a fire. Ground your positive assessment to ensure the behavior continues.',
    assertions: [
      'Stayed 3 hours past shift on the Nov 14 DB failover incident',
      'Sent stakeholder status updates every 30 minutes throughout the incident',
      'Identified root cause (misconfigured replica lag threshold) within 45 minutes',
      'Submitted a post-mortem within 24 hours with 5 action items — 3 already implemented'
    ],
    persona: PERSONAS.OPEN_OLIVIA,
  },
  {
    id: 'star-performer-blindspot',
    title: 'The Star Performer Blindspot',
    description: 'A top-performing senior engineer is undermining junior teammates while delivering excellent individual output.',
    role: Role.Giver,
    context: 'You are an engineering manager. Oscar is a star performer, but you have noticed a pattern where he dismisses feedback from juniors and uses his past wins as justification for his behavior. Your goal is to give feedback about his impact on team dynamics and junior mentorship.',
    assertions: [
      'In last week\'s retro Oscar said "I don\'t have time to review junior PRs" in front of the team',
      'Junior engineer Priya told me Oscar said "just look at my old code" when she asked for guidance',
      'Oscar\'s PR comments on juniors include "Did you even test this?" (PR #201) and "This is basic stuff"',
      'Oscar has logged 0 pairing sessions with any junior this quarter; team goal is 2/week'
    ],
    persona: PERSONAS.OVERCONFIDENT_OSCAR,
  },
  {
    id: 'quiet-quitter',
    title: 'The Quiet Quitter',
    description: 'A mid-level engineer who was once a strong contributor is now showing signs of disengagement.',
    role: Role.Giver,
    context: 'You are a Tech Lead. Chris was once a reliable contributor, but his participation and output quality have declined noticeably. You need to address this pattern and understand what has changed. Your goal is to have a meaningful conversation about his engagement and see if there are underlying issues you can help with.',
    assertions: [
      'Velocity dropped from 14 story points/sprint (Q2 avg) to 6 story points/sprint (Q3 avg)',
      'Contributed 0 comments in the last 3 sprint retrospectives',
      'Two tickets have been "In Progress" for 3+ weeks with no commits or comments',
      'Missed 4 of the last 8 standups without prior notice'
    ],
    persona: PERSONAS.CHECKED_OUT_CHRIS,
  }
];
