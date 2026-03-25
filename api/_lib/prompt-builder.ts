// Shared prompt construction logic extracted from client-side services
// Used by all three serverless API endpoints

interface PersonaInput {
  name: string;
  roleDescription: string;
  difficulty: string;
  characteristics: string[];
  voiceExamples?: string[];
}

interface ScenarioInput {
  persona: PersonaInput;
  assertions: string[];
  personaBackground?: string;
}

// GAIN-aligned scoring rubric shared by both evaluation prompts (DRY)
const GAIN_SCORING_RUBRIC = `SCORING RUBRICS — score each dimension 0-100 (integer only):

Behavioral band definitions — map observed behavior to the appropriate range. Do NOT use arithmetic, anchor points, or running adjustments. Pick the band that best describes what you observed.

1. Goal framing (G):
   90-100: Shared aspirational framing explicitly connected to the recipient's values ("we both want...", "I know this matters to you..."); visibly shifted the conversation toward collaboration.
   75-89: Clear gain-oriented framing ("this will help you/us...") that set a constructive direction before delivering feedback.
   60-74: Goal stated but framed as pain or avoidance ("stop doing X", "we need to fix this"); directional but not inspiring.
   40-59: Vague goal implied but never explicitly articulated; conversation lacked direction.
   0-39: No goal framing, or framing was counterproductive (blame, threats, fear).

2. Observation quality (A):
   90-100: All observations are precise first-hand behavioral facts with specific dates or events; zero character labels; reads like a logbook entry.
   75-89: Most observations are concrete behavioral facts; minor vagueness in one or two instances; no character labels.
   60-74: Mix of behavioral facts and vague descriptors; possibly one character label; listener could mostly picture the situation.
   40-59: Mostly generalized observations ("always", "never"); assessments masquerading as facts.
   0-39: Primarily character judgments ("you're lazy", "you're unprofessional") with little verifiable behavioral evidence.

3. Giver self-acknowledgment (A):
   90-100: Explicitly asked "what could I have done differently?" or named their own contribution before asking the recipient to change.
   75-89: Acknowledged potential blind spots or limits of their perspective without being prompted.
   60-74: Token acknowledgment ("I may be missing context") without genuine curiosity or follow-through.
   40-59: No self-acknowledgment; entire responsibility framed as recipient's.
   0-39: Giver blamed recipient without any self-reflection; reinforced one-sided framing.

4. Impact articulation (I):
   90-100: Layered, specific impact tied to named actions — business consequence + team/relationship effect, with concrete examples (project names, dates, numbers).
   75-89: At least one concrete impact with a real example; clearly connected to observed behavior.
   60-74: Impact mentioned but vague or assumed ("it affects the team") without specifics.
   40-59: Impact only implied; receiver must infer why it matters.
   0-39: No impact mentioned, or stated impact was speculative or purely personal.

5. Next action quality (N):
   90-100: Asked recipient for ideas first, then co-created a specific who/what/when commitment with a follow-up check-in scheduled.
   75-89: Proposed a specific action with clear timeline; may have asked for input but didn't fully co-create.
   60-74: Suggested an action but vague ("let's work on this") or missing timeline.
   40-59: Mentioned something should change but no concrete next step was agreed upon.
   0-39: No next action, or giver dictated a solution without asking for recipient's input.

6. Dialogue quality:
   90-100: Asked open questions throughout; actively incorporated recipient's responses into the plan; felt like a genuine two-way exchange.
   75-89: Asked at least 2 meaningful questions; showed responsiveness to answers; mostly two-way.
   60-74: Asked surface questions ("Does that make sense?") without genuinely engaging; partly monologue.
   40-59: Few or no questions; recipient rarely invited to contribute.
   0-39: Pure monologue; recipient had no meaningful opportunity to contribute.

All final dimension scores must be between 0 and 100.

CALIBRATION ANCHOR (use this to calibrate your scoring):
A conversation where the giver says "You've been missing deadlines and it's frustrating the team. Let's set up a weekly check-in" — no specific facts cited, no self-acknowledgment, vague impact, solution imposed without asking for input — would score approximately:
  Goal framing: 55 (goal stated but pain-oriented)
  Observation quality: 35 (vague, no specific instances)
  Self-acknowledgment: 20 (absent)
  Impact articulation: 45 (mentioned team frustration, no specifics)
  Next action quality: 50 (specific action but imposed, no recipient input)
  Dialogue quality: 30 (monologue, no questions asked)
Use this anchor to ensure your scores are consistent regardless of which AI provider is evaluating.

EVIDENCE REQUIREMENT: For each dimension score, you MUST cite 1-3 exact quotes from the transcript as evidence in the "evidenceQuotes" field. The feedback must reference specific moments, not generic observations.

WEIGHTED OVERALL SCORE: Compute an overall score as a weighted average using these weights:
  Observation quality: 20%
  Impact articulation: 20%
  Next action quality: 20%
  Goal framing: 15%
  Giver self-acknowledgment: 15%
  Dialogue quality: 10%
Round to the nearest integer and assign the band label (Needs Work / Developing / Proficient / Strong / Exemplary).`;

// Flores speech act analysis instruction appended to both evaluation prompts
const FLORES_ANALYSIS_INSTRUCTION = `
FLORES SPEECH ACT ANALYSIS (from Conversations for Action):
- Assertions: identify factual, verifiable claims the giver made. Mark isVerifiable=true if the claim could be confirmed with evidence (e.g. meeting logs, code history). Mark false if it is inherently subjective.
- Assessments: identify opinions or judgments. For each assess:
  - hasStandard: did the giver reference an explicit expectation or benchmark?
  - hasEvidence: is the judgment backed by observable assertions/facts?
  - groundingQuality: "well-grounded" if both present, "partially-grounded" if one, "ungrounded" if neither
- Concern: did the conversation surface and address what the RECEIVER actually cares about (not just what the giver wants to fix)? concernNotes should explain what concern was present or absent.`;

// JSON output schema shared by both evaluation prompts (DRY)
const GAIN_JSON_SCHEMA = `{
  "giverScores": [{
    "dimension": "string",
    "score": 0,
    "band": "Needs Work | Developing | Proficient | Strong | Exemplary",
    "feedback": "string",
    "evidenceQuotes": ["exact transcript excerpt supporting this score"],
    "deductions": ["specific issue noted, if any"]
  }],
  "overallScore": 0,
  "overallBand": "Needs Work | Developing | Proficient | Strong | Exemplary",
  "assertionsCited": [1, 3],
  "resistanceDecreased": true,
  "summary": {
    "whatWorked": ["string"],
    "whatBrokeDown": ["string"],
    "highestLeverageImprovement": "string"
  },
  "gainAnalysis": {
    "goalFraming": "gain-oriented | pain-oriented | missing",
    "selfAcknowledgment": false,
    "judgmentsUsed": ["exact phrase from transcript"],
    "strongObservations": ["exact phrase from transcript"],
    "nextActionCompleteness": "complete | vague | missing",
    "checkInScheduled": false
  },
  "floresAnalysis": {
    "assertionsFound": [{ "text": "exact quote", "isVerifiable": true }],
    "assessmentsFound": [{ "text": "exact quote", "hasStandard": true, "hasEvidence": true, "groundingQuality": "well-grounded | partially-grounded | ungrounded" }],
    "concernAddressed": false,
    "concernNotes": "string"
  },
  "recommendations": [{ "issue": "string", "gainReframe": "string" }]
}`;

export function buildPersonaSystemPrompt(scenario: ScenarioInput): string {
  const assertionsList = scenario.assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const voiceBlock = scenario.persona.voiceExamples?.length
    ? `## HOW YOU SPEAK\nSpeak in this voice. These are example phrases in your natural register:\n${scenario.persona.voiceExamples.map(e => `- "${e}"`).join('\n')}`
    : '';
  const backgroundBlock = scenario.personaBackground
    ? `## YOUR PRIVATE CONTEXT RIGHT NOW\n${scenario.personaBackground}`
    : '';
  const emotionalArc = scenario.persona.difficulty === 'Easy'
    ? "Open and seeking clarity -- not hostile, just want to understand."
    : scenario.persona.difficulty === 'Hard'
    ? "Resistant. May only partially concede at the very end, and only if backed by 3+ specific facts."
    : "Defensive. Concede only after 2+ grounded, fact-based exchanges.";

  return `ACT AS: ${scenario.persona.name} -- you are a real person, not an AI.

## WHO YOU ARE
${scenario.persona.roleDescription}

${backgroundBlock}

## THE FACTS IN PLAY
These facts exist in the situation. Do NOT recite them unprompted -- but when the user cites one, react from your private narrative above.
${assertionsList}

## YOUR TRAITS (let these drive your reactions)
${scenario.persona.characteristics.join(', ')}

${voiceBlock}

## BEHAVIORAL RULES
1. OPENING: You just sat down. You know roughly why. Start with 1-2 sentences -- natural, in-character, slightly guarded.
2. ASSERTIONS: When the user cites a specific fact from the list above, react from your private context -- don't pretend it's news unless it genuinely would be.
3. EMOTIONAL ARC: ${emotionalArc}
4. CONCESSION THRESHOLD: Only lower your guard when the user has cited at least 2 specific facts, articulated the impact, and offered a path forward.
5. NEVER break character. NEVER be educational. NEVER apologize for being difficult.
6. LENGTH: 2-4 sentences per response. Speak like a colleague in Slack -- not a therapist.
7. GAIN FRAMING RESPONSE: If the giver frames feedback as shared aspiration ("I'd love for us to...", "we both want..."), become noticeably more open and engaged. If the giver uses blame or complaint framing ("You always...", "You never..."), become more guarded and defensive.
8. JUDGMENT SENSITIVITY: If the giver uses character labels -- positive or negative (e.g. "you're a rockstar", "you're lazy") -- push back or deflect. React better to specific behavioral observations tied to events.
9. SOLUTION DIALOGUE: If the giver asks "what ideas do you have?" or "what would help you?" before imposing a solution, engage genuinely and offer realistic suggestions. If the giver dictates a solution without asking for your input, become passive-resistant.
10. CONVERSATION LENGTH: After approximately 8-12 exchanges, begin moving toward closure naturally. If the giver has addressed your core concerns and proposed a path forward, acknowledge it and signal readiness to wrap up ("Alright, let's try that" or "I'll think about it"). Do NOT artificially extend the conversation.`;
}

export function buildCustomScenarioPrompt(userDescription: string): string {
  return `Create a highly detailed and psychologically distinct professional feedback simulation scenario based on this specific description: "${userDescription}"

The scenario should be designed for a "Feedback Giver" (the user).

Requirements for Uniqueness:
1. AVOID GENERIC ARCHETYPES. Do not just create "Defensive Derek" or "Lazy Larry". Instead, delve into the specific interpersonal friction mentioned in the user's description.
2. PROFESSIONAL TITLE: Create a realistic, industry-specific title.
3. PROBLEM DESCRIPTION: Synthesize the user's input into a professional challenge.
4. USER CONTEXT: Define the user's relationship to the persona (e.g., "You are their technical mentor who lacks formal authority but is responsible for their output").
5. COMPLEX PERSONA:
   - NAME: A realistic name.
   - ROLE DESCRIPTION: Detailed professional background.
   - DIFFICULTY: Easy, Medium, or Hard based on the interpersonal complexity described.
   - DISTINCT CHARACTERISTICS: 3-5 traits that go beyond surface labels.

6. PERSONA BACKGROUND: Include a "personaBackground" string (2-4 sentences) describing the persona's private thoughts and emotional state at the start of the conversation. This drives more realistic resistance and concession.

Return ONLY a JSON object with this exact structure (no markdown, no code fences):
{
  "id": "string",
  "title": "string",
  "description": "string",
  "role": "Giver",
  "context": "string",
  "assertions": [],
  "persona": {
    "id": "string",
    "name": "string",
    "roleDescription": "string",
    "difficulty": "Easy" | "Medium" | "Hard",
    "characteristics": ["string"],
    "voiceExamples": ["string"]
  },
  "personaBackground": "string"
}`;
}

export function buildEvaluationPrompt(
  scenarioTitle: string,
  scenarioContext: string,
  assertions: string[],
  transcript: { role: string; text: string }[],
  difficulty?: string
): string {
  const assertionsList = assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const transcriptText = transcript
    .map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.text}`)
    .join('\n');

  const difficultyContext = difficulty ? `
DIFFICULTY CONTEXT: This persona was rated "${difficulty}". Factor this into your assessment:
- Easy persona: Good scores require demonstrating technique even when the persona is receptive. Do not inflate scores just because the persona agreed easily — assess the quality of the method, not just the outcome.
- Medium persona: Expect at least 2 grounded facts and clear impact to shift the persona. Partial movement indicates developing skill.
- Hard persona: Recognize that even partial movement indicates strong technique. A conversation that ends with the persona saying "I'll think about it" is a meaningful win — reflect this in scores.` : '';

  return `Evaluate the following feedback conversation transcript where the user was the "Feedback Giver".
Scenario: ${scenarioTitle}
Context: ${scenarioContext}
${difficultyContext}

AVAILABLE ASSERTIONS (facts the user could have cited):
${assertionsList}

Transcript:
${transcriptText}

${GAIN_SCORING_RUBRIC}
${FLORES_ANALYSIS_INSTRUCTION}

Return ONLY a JSON object (no markdown, no code fences):
${GAIN_JSON_SCHEMA}`;
}

/** Prompt for evaluating a feedback transcript without scenario context (e.g. uploaded recording/transcript). */
export function buildFeedbackOnTranscriptPrompt(transcript: { role: string; text: string }[]): string {
  const transcriptText = transcript
    .map(m => `${m.role === 'user' ? 'Feedback Giver' : 'Receiver'}: ${m.text}`)
    .join('\n');

  return `Evaluate the following feedback conversation transcript. The "Feedback Giver" is the person delivering feedback; the "Receiver" is the other party.

Transcript:
${transcriptText}

${GAIN_SCORING_RUBRIC}
${FLORES_ANALYSIS_INSTRUCTION}

Return ONLY a JSON object (no markdown, no code fences):
${GAIN_JSON_SCHEMA}`;
}
