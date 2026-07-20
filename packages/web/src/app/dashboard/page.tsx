'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface DashboardData {
  id: string;
  walletAddress: string;
  matrixBalance: number;
  withdrawnAmount: number;
  directReferrals: number;
  isQualified: boolean;
  isCapped: boolean;
  indirectCycles: number;
  matrixPosition?: {
    globalId: number;
    level: number;
    personalPoolCount: number;
    poolReserves: number;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('/api/user/dashboard')
      .then((res) => setData(res.data.user))
      .catch(() => setError('Failed to load dashboard'));
  }, []);

  if (error) return <p className="p-6 text-red-400">{error}</p>;
  if (!data) return <p className="p-6 text-slate-300">Loading...</p>;

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-sm text-slate-400">Matrix Balance</p>
            <p className="text-2xl font-bold text-cyan-400">${data.matrixBalance.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-sm text-slate-400">Withdrawn</p>
            <p className="text-2xl font-bold text-green-400">${data.withdrawnAmount.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-sm text-slate-400">Direct Referrals</p>
            <p className="text-2xl font-bold text-purple-400">{data.directReferrals}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-semibold">Status</h2>
          <div className="flex gap-4">
            <span className={`px-3 py-1 rounded-full text-sm ${data.isQualified ? 'bg-green-600' : 'bg-red-600'}`}>
              {data.isQualified ? 'Qualified' : 'Unqualified'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${data.isCapped ? 'bg-red-600' : 'bg-green-600'}`}>
              {data.isCapped ? 'Capped' : 'Active'}
            </span>
          </div>
          <p className="text-slate-300">Indirect Cycles: {data.indirectCycles}</p>
        </div>

        {data.matrixPosition && (
          <div className="bg-slate-800 p-6 rounded-xl space-y-4">
            <h2 className="text-xl font-semibold">Matrix Position</h2>
            <p className="text-slate-300">Global ID: {data.matrixPosition.globalId}</p>
            <p className="text-slate-300">Level: {data.matrixPosition.level}</p>
            <p className="text-slate-300">
              Personal Pool: {data.matrixPosition.personalPoolCount} / 40
            </p>
            <div className="w-full bg-slate-700 rounded-full h-4">
              <div
                className="bg-cyan-500 h-4 rounded-full transition-all"
                style={{ width: `${(data.matrixPosition.personalPoolCount / 40) * 100}%` }}
              />
            </div>
            <p className="text-slate-300">Pool Reserves: ${data.matrixPosition.poolReserves.toFixed(2)}</p>
          </div>
        )}
      </div>
    </main>
  );
}
