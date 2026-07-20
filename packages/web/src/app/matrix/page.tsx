'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface MatrixNode {
  globalId: number;
  level: number;
  user: { walletAddress: string };
  children: MatrixNode[];
}

export default function Matrix() {
  const [tree, setTree] = useState<MatrixNode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get('/api/matrix/tree')
      .then((res) => setTree(res.data))
      .catch(() => setError('Failed to load matrix tree'));
  }, []);

  if (error) return <p className="p-6 text-red-400">{error}</p>;
  if (!tree) return <p className="p-6 text-slate-300">Loading...</p>;

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Matrix Tree</h1>
        <div className="bg-slate-800 p-6 rounded-xl">
          <TreeNode node={tree} />
        </div>
      </div>
    </main>
  );
}

function TreeNode({ node, depth = 0 }: { node: MatrixNode; depth?: number }) {
  return (
    <div className={`ml-${depth * 4} border-l-2 border-slate-600 pl-4 my-2`}>
      <div className="bg-slate-700 p-3 rounded-lg inline-block">
        <p className="font-mono text-sm text-cyan-300">{node.user.walletAddress}</p>
        <p className="text-xs text-slate-400">Global ID: {node.globalId} | Level: {node.level}</p>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-2">
          {node.children.map((child) => (
            <TreeNode key={child.globalId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
