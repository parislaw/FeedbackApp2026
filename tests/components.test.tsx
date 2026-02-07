import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock geminiService to prevent API calls
vi.mock('../services/geminiService', () => ({
  geminiService: {
    generateCustomScenario: vi.fn(),
    createPersonaChat: vi.fn(),
    evaluateTranscript: vi.fn(),
  },
}));

// Mock @google/genai for ChatInterface
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  Modality: { AUDIO: 'AUDIO' },
}));

import { ScenarioCard } from '../components/ScenarioCard';
import { EvaluationReport } from '../components/EvaluationReport';
import { CustomScenarioForm } from '../components/CustomScenarioForm';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Difficulty, Role } from '../types';
import type { Scenario, EvaluationReport as EvaluationReportType } from '../types';

const mockScenario: Scenario = {
  id: 'test-scenario',
  title: 'Test Scenario',
  description: 'A test scenario for unit testing.',
  role: Role.Giver,
  context: 'You are testing the application.',
  persona: {
    id: 'test-persona',
    name: 'Test Person',
    roleDescription: 'A test persona for testing.',
    difficulty: Difficulty.Medium,
    characteristics: ['Trait A', 'Trait B'],
  },
};

const mockReport: EvaluationReportType = {
  giverScores: [
    { dimension: 'Standard clarity', score: 2.5, feedback: 'Good clarity.' },
    { dimension: 'Specificity of assertions', score: 1.0, feedback: 'Needs improvement.' },
  ],
  summary: {
    whatWorked: ['Clear goal setting', 'Good tone'],
    whatBrokeDown: ['Vague assertions'],
    highestLeverageImprovement: 'Use more specific examples.',
  },
  recommendations: ['Practice grounding assessments.', 'Reference specific tickets.'],
};

describe('ScenarioCard', () => {
  it('renders scenario title and description', () => {
    render(<ScenarioCard scenario={mockScenario} onSelect={vi.fn()} />);
    expect(screen.getByText('Test Scenario')).toBeInTheDocument();
    expect(screen.getByText('A test scenario for unit testing.')).toBeInTheDocument();
  });

  it('renders persona name and difficulty', () => {
    render(<ScenarioCard scenario={mockScenario} onSelect={vi.fn()} />);
    expect(screen.getByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders Start Practice button', () => {
    render(<ScenarioCard scenario={mockScenario} onSelect={vi.fn()} />);
    expect(screen.getByText('Start Practice')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScenarioCard scenario={mockScenario} onSelect={onSelect} />);
    await user.click(screen.getByText('Start Practice'));
    expect(onSelect).toHaveBeenCalledWith(mockScenario);
  });

  it('calls onSelect on keyboard Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScenarioCard scenario={mockScenario} onSelect={onSelect} />);
    const card = screen.getByRole('listitem');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(mockScenario);
  });

  it('has correct aria-label', () => {
    render(<ScenarioCard scenario={mockScenario} onSelect={vi.fn()} />);
    const card = screen.getByRole('listitem');
    expect(card).toHaveAttribute('aria-label', 'Test Scenario scenario with Test Person, Medium difficulty');
  });

  it('renders Easy difficulty with green styling', () => {
    const easyScenario = {
      ...mockScenario,
      persona: { ...mockScenario.persona, difficulty: Difficulty.Easy },
    };
    render(<ScenarioCard scenario={easyScenario} onSelect={vi.fn()} />);
    const badge = screen.getByText('Easy');
    expect(badge.className).toContain('bg-green-100');
  });
});

describe('EvaluationReport', () => {
  it('renders the report heading', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('Performance Report')).toBeInTheDocument();
  });

  it('renders all score dimensions', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('Standard clarity')).toBeInTheDocument();
    expect(screen.getByText('Specificity of assertions')).toBeInTheDocument();
  });

  it('renders score values', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('2.5/3')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders feedback text', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('Good clarity.')).toBeInTheDocument();
    expect(screen.getByText('Needs improvement.')).toBeInTheDocument();
  });

  it('renders what worked and what broke down', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('Clear goal setting')).toBeInTheDocument();
    expect(screen.getByText('Vague assertions')).toBeInTheDocument();
  });

  it('renders highest leverage improvement', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('"Use more specific examples."')).toBeInTheDocument();
  });

  it('renders recommendations', () => {
    render(<EvaluationReport report={mockReport} onReset={vi.fn()} />);
    expect(screen.getByText('Practice grounding assessments.')).toBeInTheDocument();
    expect(screen.getByText('Reference specific tickets.')).toBeInTheDocument();
  });

  it('calls onReset when Practice Another Scenario is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<EvaluationReport report={mockReport} onReset={onReset} />);
    await user.click(screen.getByText('Practice Another Scenario'));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

describe('CustomScenarioForm', () => {
  it('renders the form heading', () => {
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={vi.fn()} isGenerating={false} />);
    expect(screen.getByText('Describe Your Scenario')).toBeInTheDocument();
  });

  it('renders guidance side panel', () => {
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={vi.fn()} isGenerating={false} />);
    expect(screen.getByText('How to write a great description')).toBeInTheDocument();
    expect(screen.getByText('Be Specific')).toBeInTheDocument();
    expect(screen.getByText('Include Impact')).toBeInTheDocument();
  });

  it('submit button is disabled when textarea is empty', () => {
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={vi.fn()} isGenerating={false} />);
    const submitBtn = screen.getByText('Generate Practice Session');
    expect(submitBtn.closest('button')).toBeDisabled();
  });

  it('submit button enables when text is entered', async () => {
    const user = userEvent.setup();
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={vi.fn()} isGenerating={false} />);
    const textarea = screen.getByPlaceholderText('Tell us about the colleague, the specific issues, and the dynamic...');
    await user.type(textarea, 'My colleague misses standups');
    const submitBtn = screen.getByText('Generate Practice Session');
    expect(submitBtn.closest('button')).not.toBeDisabled();
  });

  it('calls onGenerate with description on submit', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<CustomScenarioForm onGenerate={onGenerate} onCancel={vi.fn()} isGenerating={false} />);
    const textarea = screen.getByPlaceholderText('Tell us about the colleague, the specific issues, and the dynamic...');
    await user.type(textarea, 'Test description');
    const submitBtn = screen.getByText('Generate Practice Session');
    await user.click(submitBtn);
    expect(onGenerate).toHaveBeenCalledWith('Test description');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={onCancel} isGenerating={false} />);
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows loading state when generating', () => {
    render(<CustomScenarioForm onGenerate={vi.fn()} onCancel={vi.fn()} isGenerating={true} />);
    expect(screen.getByText('Designing Simulation...')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test error message');
    };

    // Suppress console.error from React for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
