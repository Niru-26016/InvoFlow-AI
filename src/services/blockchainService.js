import SHA256 from 'crypto-js/sha256';
import { collection, addDoc, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const LEDGER_COLLECTION = 'ledger';

/**
 * Calculate SHA-256 hash for a block
 */
function calculateHash(block) {
  const data = `${block.blockIndex}${block.timestamp}${block.invoiceId}${block.action}${block.fromUser}${block.toUser}${block.amount}${block.previousHash}`;
  return SHA256(data).toString();
}

/**
 * Get the last block from the ledger
 */
async function getLastBlock() {
  const q = query(
    collection(db, LEDGER_COLLECTION),
    orderBy('blockIndex', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Log a transaction to the blockchain ledger
 * 
 * @param {string} invoiceId - The invoice ID
 * @param {string} action - Action type: invoice_uploaded, invoice_verified, invoice_rejected,
 *                          bid_placed, offer_accepted, payment_disbursed,
 *                          settlement_msme, settlement_funder
 * @param {object} details - Additional details
 * @param {string} details.fromUser - User initiating the action
 * @param {string} details.fromName - Display name of the initiator
 * @param {string} details.toUser - Target user (optional)
 * @param {string} details.toName - Display name of target (optional)
 * @param {number} details.amount - Amount involved (optional)
 * @param {string} details.invoiceNumber - Invoice number for display
 * @param {object} details.metadata - Any extra metadata
 */
export async function logToLedger(invoiceId, action, details = {}) {
  try {
    const lastBlock = await getLastBlock();
    const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 0;
    const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);

    const block = {
      blockIndex,
      timestamp: new Date().toISOString(),
      invoiceId,
      invoiceNumber: details.invoiceNumber || '',
      action,
      fromUser: details.fromUser || '',
      fromName: details.fromName || '',
      toUser: details.toUser || '',
      toName: details.toName || '',
      amount: details.amount || 0,
      previousHash,
      metadata: details.metadata || {},
    };

    // Calculate hash
    block.hash = calculateHash(block);

    // Store in Firestore
    await addDoc(collection(db, LEDGER_COLLECTION), block);

    console.log(`⛓️ Block #${blockIndex} logged: ${action} for ${invoiceId}`);
    return block;
  } catch (err) {
    console.error('Blockchain ledger error:', err);
    // Don't throw — ledger logging should not break main flow
    return null;
  }
}

/**
 * Fetch full chain from Firestore
 */
export async function getFullChain() {
  const q = query(
    collection(db, LEDGER_COLLECTION),
    orderBy('blockIndex', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Verify the integrity of the entire chain
 * Returns { valid: boolean, invalidBlock: number | null, message: string }
 */
export async function verifyChain() {
  const chain = await getFullChain();

  if (chain.length === 0) {
    return { valid: true, invalidBlock: null, message: 'Chain is empty — no blocks to verify.' };
  }

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];

    // Verify hash
    const recalculated = calculateHash(block);
    if (block.hash !== recalculated) {
      return {
        valid: false,
        invalidBlock: block.blockIndex,
        message: `Block #${block.blockIndex} hash mismatch! Data may have been tampered.`
      };
    }

    // Verify chain link (previousHash)
    if (i > 0) {
      const prevBlock = chain[i - 1];
      if (block.previousHash !== prevBlock.hash) {
        return {
          valid: false,
          invalidBlock: block.blockIndex,
          message: `Block #${block.blockIndex} previousHash doesn't match Block #${prevBlock.blockIndex} hash. Chain is broken!`
        };
      }
    } else {
      // Genesis block should have previousHash of all zeros
      if (block.previousHash !== '0'.repeat(64)) {
        return {
          valid: false,
          invalidBlock: 0,
          message: 'Genesis block has invalid previousHash.'
        };
      }
    }
  }

  return { valid: true, invalidBlock: null, message: `Chain verified! All ${chain.length} blocks are valid. ✅` };
}

// Action type labels for display
export const ACTION_LABELS = {
  invoice_uploaded: { label: 'Invoice Uploaded', color: 'primary', emoji: '📤' },
  invoice_verified: { label: 'Invoice Verified', color: 'accent', emoji: '✅' },
  invoice_rejected: { label: 'Invoice Rejected', color: 'danger', emoji: '❌' },
  bid_placed: { label: 'Bid Placed', color: 'warning', emoji: '💰' },
  offer_accepted: { label: 'Offer Accepted', color: 'accent', emoji: '🤝' },
  payment_disbursed: { label: 'Payment Disbursed', color: 'primary', emoji: '💸' },
  settlement_msme: { label: 'Settlement → MSME', color: 'accent', emoji: '🏦' },
  settlement_funder: { label: 'Settlement → Funder', color: 'primary', emoji: '🏛️' },
  escrow_deposit: { label: 'Deposited to Escrow', color: 'accent', emoji: '📥' },
  escrow_withdrawal_msme: { label: 'Withdrawn from Escrow', color: 'accent', emoji: '📤' },
  escrow_repayment: { label: 'Repayment to Escrow', color: 'primary', emoji: '📥' },
  escrow_withdrawal_funder: { label: 'Settlement Withdrawn', color: 'primary', emoji: '📤' },
};
