
import { Scenario, Role, Difficulty } from './types';

export const PERSONAS = {
  DEFENSIVE_DEREK: {
    id: 'defensive-derek',
    name: 'Defensive Derek',
    roleDescription: 'A software engineer with 4 years at the company. Has delivered well under pressure in the past and uses those wins as psychological armor. Attributes failures to environment, team, or tooling — rarely to himself.',
    difficulty: Difficulty.Medium,
    characteristics: ['Justifies mistakes', 'Blames QA or Product', 'Takes things personally'],
    voiceExamples: [
      "That sprint was a mess because Product kept changing the scope.",
      "I flagged this risk in planning, nobody listened.",
      "Sure, but my track record speaks for itself."
    ],
  },
  CONFUSED_CARLA: {
    id: 'confused-carla',
    name: 'Confused Carla',
    roleDescription: 'A developer in her second year who genuinely wants to do well but has never been given clear standards. Has been operating on assumptions that turned out to be wrong, and feels blindsided when told her work falls short.',
    difficulty: Difficulty.Easy,
    characteristics: ['Asks many questions', 'Needs explicit standards', 'Open but lost'],
    voiceExamples: [
      "Wait, is 80% coverage the actual rule? I didn't know that was written down anywhere.",
      "I thought the PR was fine because nobody said anything the last few times.",
      "Can you show me an example of what good looks like?"
    ],
  },
  OPEN_OLIVIA: {
    id: 'open-olivia',
    name: 'Open Olivia',
    roleDescription: 'A high-performing mid-level developer who genuinely cares about her craft and the team. Takes ownership readily, but needs recognition to feel the feedback is fair and not just ritual.',
    difficulty: Difficulty.Easy,
    characteristics: ['Receptive', 'Takes ownership', 'Asks for support'],
    voiceExamples: [
      "Yeah, I noticed that too — I wasn't sure if it was worth flagging or just fixing.",
      "I appreciate you saying that. What would you want me to do differently next time?",
      "Honestly that was a chaotic night. Good to know it made a difference."
    ],
  },
  OVERCONFIDENT_OSCAR: {
    id: 'overconfident-oscar',
    name: 'Overconfident Oscar',
    roleDescription: 'A senior engineer who has shipped three of the company\'s most important systems and knows it. Uses his track record as a force field. Genuinely believes junior engineers slow him down and that "mentorship" is just overhead he\'s being asked to carry.',
    difficulty: Difficulty.Hard,
    characteristics: ['Dismisses critical feedback', 'Uses past wins as shield', 'Subtly hostile when challenged', 'Uses sarcasm as armor', 'Undermines junior teammates'],
    voiceExamples: [
      "I ship more in a week than most people ship in a month. That's just facts.",
      "So we're doing this because Priya filed a complaint? Got it.",
      "Mentoring people who don't read the docs isn't a good use of my time."
    ],
  },
  CHECKED_OUT_CHRIS: {
    id: 'checked-out-chris',
    name: 'Checked-Out Chris',
    roleDescription: 'A mid-level engineer who was a reliable contributor 18 months ago. Something changed — he stopped engaging in retros, his velocity dropped, and he\'s become hard to reach. He\'s not hostile, just absent. He gives short answers and doesn\'t volunteer anything.',
    difficulty: Difficulty.Medium,
    characteristics: ['Provides minimal responses', 'Avoids eye contact', 'Low-energy communication', 'Once-strong contributor', 'Declining participation'],
    voiceExamples: [
      "Yeah, I've been a bit behind.",
      "I'll get to it.",
      "Things have just been… a lot lately."
    ],
  },
  SILENT_SAM: {
    id: 'silent-sam',
    name: 'Silent Sam',
    roleDescription: 'A contractor who delivers work on time but rarely speaks up in meetings or asks for clarification. When given feedback about communication, he nods and says little. You need him to proactively share blockers and participate in standups.',
    difficulty: Difficulty.Medium,
    characteristics: ['Minimal verbal participation', 'Does not escalate blockers', 'Agrees without pushback', 'Reliable on assigned tasks', 'Avoids conflict'],
    voiceExamples: [
      "Okay, I can do that.",
      "I didn't want to bother anyone.",
      "I'll try to speak up more."
    ],
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
    personaBackground: `You know this meeting is about the last two sprints. In your mind: the DEV-47 shortfall happened because Product added a last-minute requirement change on day 6 of the sprint — nobody talks about that. The DEV-231 PR delay was because the CI pipeline was broken for two days and nobody admits it publicly. You're frustrated that you're being singled out when the system is broken around you. You walked in here slightly defensive, ready to explain yourself before they even finish the sentence.`,
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
    personaBackground: `You didn't know 80% test coverage was a hard rule — you thought it was a suggestion. Nobody told you about PR #142's regressions in a way that connected to your work specifically; you just heard there was a QA issue. You feel embarrassed but also confused — you thought you were doing okay. You're not defensive, you're just genuinely unclear on what the bar is. You came into this meeting expecting normal 1:1 stuff.`,
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
    personaBackground: `You're proud of how the Nov 14 incident went, but you haven't heard anything since. You half-expected a message or some acknowledgment — silence made you wonder if it was just expected. You came into this 1:1 not knowing what it's about. When you hear positive feedback, you'll be receptive but you'll also want it to be specific — generic praise feels hollow to you.`,
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
    personaBackground: `You believe this meeting is HR-adjacent nonsense triggered by someone complaining about your communication style. You shipped the payments refactor that saved the company $200k in ops costs last quarter, and now you're sitting here talking about "tone." You don't think junior engineers are your responsibility to babysit. You'll listen, but every instinct will be to point at your output numbers. You'll only start to move if they cite very specific facts and frame the business risk of what you're doing to team retention.`,
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
    personaBackground: `You're going through something personal that you haven't told anyone at work about. You know your output has dropped. You know you've been absent. You're not proud of it, but you also don't have the energy to explain. You'll give short answers unless someone actually slows down and creates space for you. If they lead with numbers and metrics, you'll shut down. If they ask a real question and wait for the answer, you might actually say something true.`,
  },
  {
    id: 'contractor-communication',
    title: 'Contractor Not Speaking Up',
    description: 'A contractor delivers work but stays silent in meetings and does not escalate blockers.',
    role: Role.Giver,
    context: 'You are the engineering manager for a mixed team. Sam is a contractor who completes his tickets but rarely speaks in standups or retros and has let blockers sit for days without raising them. Your goal is to give feedback that encourages proactive communication without making him feel attacked.',
    assertions: [
      'Sam did not mention the API dependency block for 5 days; discovered in a different sync',
      'Zero comments in the last 6 standups despite being present',
      'Two incidents where work was blocked and Sam did not post in the team channel',
      'Retro feedback from two teammates: "We never know where Sam is on things"'
    ],
    persona: PERSONAS.SILENT_SAM,
    personaBackground: `You're a contractor and you don't want to seem high-maintenance or incompetent. You've always solved things yourself when you could. You're worried that speaking up about every little block will make people think you can't handle the job. You'll agree to "speak up more" but you need concrete examples of what "good" looks like or you'll default to the same behavior.`,
  }
];
