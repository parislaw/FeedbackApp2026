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
6. LENGTH: 2-4 sentences per response. Speak like a colleague in Slack -- not a therapist.`;
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
  }
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

SCORING RUBRICS -- score each dimension 0-3:
1. Standard clarity: 0=none stated, 1=vague, 2=referenced a standard, 3=specific measurable standard with source
2. Specificity of assertions: 0=no facts cited, 1=vague reference, 2=1-2 specific facts cited, 3=3+ assertions cited with precision
3. Quality of grounding: 0=pure judgment, 1=weak evidence, 2=mostly fact-based, 3=clean fact vs judgment separation throughout
4. Impact articulation: 0=none, 1=vague impact stated, 2=team impact with example, 3=business+team impact with specific example
5. Emotional regulation: 0=aggressive or combative, 1=frustrated tone, 2=professional, 3=compassionate and direct
6. Commitment quality: 0=no next step proposed, 1=vague next step, 2=specific ask, 3=concrete next step with timeframe

ALSO EVALUATE:
- Which assertion numbers did the user actually cite?
- Was the GAIN framework followed? (Goal -> Action -> Impact -> Next Action)
- Did the persona's resistance visibly decrease by the end?

Return ONLY a JSON object (no markdown, no code fences):
{
  "giverScores": [{ "dimension": "string", "score": 0, "feedback": "string" }],
  "summary": {
    "whatWorked": ["string"],
    "whatBrokeDown": ["string"],
    "highestLeverageImprovement": "string"
  },
  "recommendations": ["string"]
}`;
}
