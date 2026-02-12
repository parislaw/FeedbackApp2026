/// <reference types="vite/client" />
import React, { useState } from 'react';

interface PasswordOverlayProps {
  onAuthenticated: () => void;
}

export const PasswordOverlay: React.FC<PasswordOverlayProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const requiredPassword = import.meta.env.VITE_APP_PASSWORD;

    if (password === requiredPassword) {
      // Store authentication in sessionStorage (not localStorage for security)
      sessionStorage.setItem('app-authenticated', 'true');
      onAuthenticated();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            L
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Lumenalta</h1>
          <p className="text-slate-500 text-sm mt-2">Feedback Practice</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Access Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Authenticating...' : 'Access App'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          This app requires authentication to prevent unauthorized token usage.
        </p>
      </div>
    </div>
  );
};
