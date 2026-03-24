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
const GAIN_SCORING_RUBRIC = `SCORING RUBRICS -- score each dimension 0-100 (integer only):

Rubric bands:
0-39: Needs Work — dimension largely absent or counterproductive
40-59: Developing — partial attempt, key elements missing
60-74: Proficient — solid execution with minor gaps
75-89: Strong — consistent, effective delivery
90-100: Exemplary — masterful, nuanced, nothing to add

Automatic deductions (apply before assigning final score):
- Ungrounded assessment with no observable evidence: -10 each
- Character judgment instead of behavioral observation (e.g. "you're lazy"): -15 each
- Missing next action entirely: -20
- No goal framing whatsoever: -15
- No giver self-acknowledgment: -10

Dimensions to score:
1. Goal framing (G): Start at 75. +15 if shared aspirational framing ("we both want..."). -15 if no goal stated. -10 if only pain/avoid framing ("stop doing X"). Reach 90+ only for genuine shared aspiration that resonated.
2. Observation quality (A): Start at 75. +15 if all observations are precise behavioral facts with zero character labels. -15 per character judgment used. -10 if mostly vague.
3. Giver self-acknowledgment (A): Start at 60. +20 if explicitly asked "what could I do differently?" or named own contribution. -10 if only token acknowledgment. Score 0-39 if giver blamed recipient entirely.
4. Impact articulation (I): Start at 50. +20 if layered impact (team + business) tied to specific actions. +10 if one concrete impact with example. Score 0-39 if no impact mentioned.
5. Next action quality (N): Start at 50. +20 if asked recipient ideas first + who/what/when specified + check-in scheduled. +10 if specific ask with action. Score 0-39 if no next action stated.
6. Dialogue quality: Start at 60. +20 if asked perspective first and incorporated responses into plan. -15 if monologue with no questions. -10 if only surface questions.`;

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
  "giverScores": [{ "dimension": "string", "score": 0, "feedback": "string" }],
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
9. SOLUTION DIALOGUE: If the giver asks "what ideas do you have?" or "what would help you?" before imposing a solution, engage genuinely and offer realistic suggestions. If the giver dictates a solution without asking for your input, become passive-resistant.`;
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
  transcript: { role: string; text: string }[]
): string {
  const assertionsList = assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const transcriptText = transcript
    .map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.text}`)
    .join('\n');

  return `Evaluate the following feedback conversation transcript where the user was the "Feedback Giver".
Scenario: ${scenarioTitle}
Context: ${scenarioContext}

AVAILABLE ASSERTIONS (facts the user could have cited):
${assertionsList}

Transcript:
${transcriptText}

${GAIN_SCORING_RUBRIC}
${FLORES_ANALYSIS_INSTRUCTION}

ALSO EVALUATE:
- Which assertion numbers did the user actually cite?
- Did the persona's resistance visibly decrease by the end?

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

ALSO EVALUATE:
- What worked well and what broke down?
- Highest leverage improvement for the feedback giver

Return ONLY a JSON object (no markdown, no code fences):
${GAIN_JSON_SCHEMA}`;
}
