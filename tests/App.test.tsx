import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock geminiService
vi.mock('../services/geminiService', () => ({
  geminiService: {
    generateCustomScenario: vi.fn(),
    createPersonaChat: vi.fn().mockResolvedValue({
      sendMessage: vi.fn().mockResolvedValue({ text: 'Hello from persona' }),
    }),
    evaluateTranscript: vi.fn(),
  },
}));

// Mock @google/genai
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  Modality: { AUDIO: 'AUDIO' },
}));

import App from '../App';

describe('App', () => {
  it('renders the app header', () => {
    render(<App />);
    const matches = screen.getAllByText('Lumenalta');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Calibrate Your Feedback Skills')).toBeInTheDocument();
  });

  it('renders all three scenario cards', () => {
    render(<App />);
    expect(screen.getByText('Missed Deadlines')).toBeInTheDocument();
    expect(screen.getByText('Code Quality Issues')).toBeInTheDocument();
    expect(screen.getByText('Positive Reinforcement')).toBeInTheDocument();
  });

  it('renders the mode toggle with Text selected by default', () => {
    render(<App />);
    const textTab = screen.getByRole('tab', { name: 'Text Mode' });
    const voiceTab = screen.getByRole('tab', { name: 'Voice Mode' });
    expect(textTab).toHaveAttribute('aria-selected', 'true');
    expect(voiceTab).toHaveAttribute('aria-selected', 'false');
  });

  it('switches mode toggle when Voice Mode is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    const voiceTab = screen.getByRole('tab', { name: 'Voice Mode' });
    await user.click(voiceTab);
    expect(voiceTab).toHaveAttribute('aria-selected', 'true');
    const textTab = screen.getByRole('tab', { name: 'Text Mode' });
    expect(textTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders Create Custom Scenario button', () => {
    render(<App />);
    expect(screen.getByText('Create Custom Scenario')).toBeInTheDocument();
  });

  it('shows custom scenario form when Create Custom Scenario is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Create Custom Scenario'));
    expect(screen.getByText('Describe Your Scenario')).toBeInTheDocument();
  });

  it('returns to dashboard when Cancel is clicked in custom form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Create Custom Scenario'));
    expect(screen.getByText('Describe Your Scenario')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel'));
    expect(screen.getByText('Calibrate Your Feedback Skills')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    render(<App />);
    expect(screen.getByText(/Lumenalta Culture Lab/)).toBeInTheDocument();
  });

  it('renders Dashboard nav button', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('has accessible scenario list', () => {
    render(<App />);
    const list = screen.getByRole('list', { name: 'Available practice scenarios' });
    expect(list).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });
});
