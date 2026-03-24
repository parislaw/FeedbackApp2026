/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) navigate('/');
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || 'Invalid email or password.');
      setIsSubmitting(false);
    } else {
      window.location.href = '/'; // full reload so App.tsx re-checks session
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Accord</h1>
          <p className="text-slate-500 text-sm mt-1">Feedback Practice</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
