import 'dotenv/config';
import { ethers } from 'ethers';
import { prisma } from '../db';

const ABI = [
  'event IDActivated(address indexed user, uint256 indexed id, address indexed sponsor)',
  'event ReTopUp(address indexed user, address indexed sponsor)',
  'event PoolReset(address indexed user)',
  'event IndirectPaid(address indexed user, uint256 amount)',
  'event LevelPaid(address indexed user, uint256 amount)',
  'event DirectPaid(address indexed user, uint256 amount)',
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.BSC_TESTNET_RPC || process.env.BSC_MAINNET_RPC || process.env.RPC_URL;
const POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '60000', 10);
const START_BLOCK = parseInt(process.env.INDEXER_START_BLOCK || '0', 10);

function getProvider() {
  if (!RPC_URL) throw new Error('RPC_URL not configured');
  return new ethers.JsonRpcProvider(RPC_URL);
}

function amountFromData(amount: bigint | undefined): number | null {
  if (amount === undefined) return null;
  return Number(ethers.formatEther(amount));
}

function serializeArgs(args: any): Record<string, any> {
  if (!args || typeof args !== 'object') return args;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'bigint') {
      result[key] = value.toString();
    } else if (typeof value === 'object' && value !== null) {
      result[key] = serializeArgs(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function indexEvents(fromBlock?: number, toBlock?: number) {
  if (!CONTRACT_ADDRESS) {
    console.warn('[indexer] CONTRACT_ADDRESS not set, skipping');
    return;
  }

  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const latest = await provider.getBlockNumber();
  const start = fromBlock ?? START_BLOCK;
  const end = toBlock ?? latest;

  if (start > end) return;

  const events = await contract.queryFilter(contract.filters.IDActivated(), start, end);
  events.push(...(await contract.queryFilter(contract.filters.ReTopUp(), start, end)));
  events.push(...(await contract.queryFilter(contract.filters.PoolReset(), start, end)));
  events.push(...(await contract.queryFilter(contract.filters.IndirectPaid(), start, end)));
  events.push(...(await contract.queryFilter(contract.filters.LevelPaid(), start, end)));
  events.push(...(await contract.queryFilter(contract.filters.DirectPaid(), start, end)));

  events.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    return a.index - b.index;
  });

  let inserted = 0;
  for (const event of events) {
    const log = event as any;
    const eventName = log.eventName || log.fragment?.name || log.name || 'Unknown';
    const walletAddress = (log.args?.user as string)?.toLowerCase() ?? '';
    const amount = amountFromData(log.args?.amount);

    try {
      await prisma.contractEvent.create({
        data: {
          eventName,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          walletAddress,
          amount,
          rawData: {
            args: log.args ? serializeArgs(log.args) : {},
            topics: log.log?.topics,
          },
        },
      });
      inserted++;
    } catch (err: any) {
      if (err.code === 'P2002') {
        // duplicate, ignore
      } else {
        console.error('[indexer] Error inserting event:', err);
      }
    }
  }

  console.log(`[indexer] Indexed ${inserted} new events from block ${start} to ${end}`);
  return { inserted, fromBlock: start, toBlock: end };
}

export async function runIndexerLoop() {
  console.log('[indexer] Starting event indexer loop');
  while (true) {
    try {
      await indexEvents();
    } catch (err) {
      console.error('[indexer] Loop error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

if (require.main === module) {
  runIndexerLoop().catch(console.error);
}
