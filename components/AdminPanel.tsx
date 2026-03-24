/// <reference types="vite/client" />
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminReportsTab } from './AdminReportsTab';

type Tab = 'users' | 'reports';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <button
          onClick={() => navigate('/')}
          className="text-slate-500 hover:text-blue-600 text-sm font-medium"
        >
          ← Dashboard
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        {(['users', 'reports'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'users' ? <AdminUsersTab /> : <AdminReportsTab />}
    </div>
  );
};
