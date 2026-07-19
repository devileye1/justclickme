import { ethers } from 'ethers';

const API_URL = 'http://localhost:4000';
const ADMIN_PK = '0xe77dced2bdc739694cd77a2011fb76a6b062d0d217d5bf9bd291614af4d3b173';
const signer = new ethers.Wallet(ADMIN_PK);
const ADMIN_WALLET = signer.address;

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

async function main() {
  console.log('=== Testing Admin Endpoints ===');

  // 1. Get nonce
  const nonceRes = await request('/api/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: ADMIN_WALLET }),
  });
  console.log('nonce:', nonceRes);
  const nonce = nonceRes.body.nonce;

  // 2. Sign nonce
  const signature = await signer.signMessage(nonce);

  // 3. Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: ADMIN_WALLET, signature }),
  });
  console.log('login:', loginRes);
  const token = loginRes.body.token;

  const headers = { Authorization: `Bearer ${token}` };

  // 4. Test admin endpoints
  const stats = await request('/api/admin/stats', { headers });
  console.log('stats:', stats);

  const users = await request('/api/admin/users?page=1&limit=5', { headers });
  console.log('users:', users);

  const audit = await request('/api/admin/audit?page=1&limit=5', { headers });
  console.log('audit:', audit);

  const sessions = await request('/api/admin/sessions?page=1&limit=5', { headers });
  console.log('sessions:', sessions);

  const transactions = await request('/api/admin/transactions?page=1&limit=5', { headers });
  console.log('transactions:', transactions);

  const analytics = await request('/api/admin/analytics?days=7', { headers });
  console.log('analytics:', analytics);
}

main().catch(console.error);
