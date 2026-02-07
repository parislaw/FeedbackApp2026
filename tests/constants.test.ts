import { describe, it, expect } from 'vitest';
import { SCENARIOS, PERSONAS, RUBRIC_DIMENSIONS } from '../constants';
import { Difficulty, Role } from '../types';

describe('PERSONAS', () => {
  it('defines three personas', () => {
    expect(Object.keys(PERSONAS)).toHaveLength(3);
  });

  it('each persona has required fields', () => {
    for (const persona of Object.values(PERSONAS)) {
      expect(persona.id).toBeTruthy();
      expect(persona.name).toBeTruthy();
      expect(persona.roleDescription).toBeTruthy();
      expect(Object.values(Difficulty)).toContain(persona.difficulty);
      expect(persona.characteristics.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('has unique persona IDs', () => {
    const ids = Object.values(PERSONAS).map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Defensive Derek is Medium difficulty', () => {
    expect(PERSONAS.DEFENSIVE_DEREK.difficulty).toBe(Difficulty.Medium);
  });

  it('Confused Carla is Easy difficulty', () => {
    expect(PERSONAS.CONFUSED_CARLA.difficulty).toBe(Difficulty.Easy);
  });

  it('Open Olivia is Easy difficulty', () => {
    expect(PERSONAS.OPEN_OLIVIA.difficulty).toBe(Difficulty.Easy);
  });
});

describe('SCENARIOS', () => {
  it('defines three scenarios', () => {
    expect(SCENARIOS).toHaveLength(3);
  });

  it('each scenario has required fields', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.title).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.role).toBe(Role.Giver);
      expect(scenario.context).toBeTruthy();
      expect(scenario.persona).toBeDefined();
      expect(scenario.persona.name).toBeTruthy();
    }
  });

  it('has unique scenario IDs', () => {
    const ids = SCENARIOS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all scenarios are Giver role', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.role).toBe(Role.Giver);
    }
  });

  it('scenarios reference valid personas', () => {
    const personaIds = Object.values(PERSONAS).map(p => p.id);
    for (const scenario of SCENARIOS) {
      expect(personaIds).toContain(scenario.persona.id);
    }
  });
});

describe('RUBRIC_DIMENSIONS', () => {
  it('defines six evaluation dimensions', () => {
    expect(RUBRIC_DIMENSIONS).toHaveLength(6);
  });

  it('includes expected dimensions', () => {
    expect(RUBRIC_DIMENSIONS).toContain('Standard clarity');
    expect(RUBRIC_DIMENSIONS).toContain('Specificity of assertions');
    expect(RUBRIC_DIMENSIONS).toContain('Quality of grounding');
    expect(RUBRIC_DIMENSIONS).toContain('Impact articulation');
    expect(RUBRIC_DIMENSIONS).toContain('Emotional regulation');
    expect(RUBRIC_DIMENSIONS).toContain('Commitment quality');
  });
});
