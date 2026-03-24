/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

type Status = 'loading' | 'ready' | 'submitting' | 'error' | 'invalid';

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Validate the token and pre-fill email
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`/api/admin/invite?token=${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setErrorMsg(body.error || 'Invitation is invalid or has expired.');
          setStatus('invalid');
        } else {
          const data = await r.json();
          setEmail(data.email);
          setStatus('ready');
        }
      })
      .catch(() => {
        setErrorMsg('Failed to validate invitation. Please try again.');
        setStatus('invalid');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const r = await fetch('/api/admin/invite-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setErrorMsg(body.error || 'Failed to create account.');
        setStatus('ready');
      } else {
        navigate('/login?invited=1');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('ready');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full mx-4 text-center">
          <p className="text-red-600 font-medium">{errorMsg || 'Invalid invitation.'}</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-blue-600 hover:underline text-sm">
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">L</div>
          <h1 className="text-xl font-bold text-slate-900">Set up your account</h1>
          <p className="text-slate-500 text-sm mt-1">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              disabled={status === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              disabled={status === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
              disabled={status === 'submitting'}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !name || !password || !confirm}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Creating account...' : 'Activate Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
