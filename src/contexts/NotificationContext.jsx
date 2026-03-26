import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

export const useBadges = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const { user, userRole } = useAuth();
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (!user || !userRole) {
      setBadges({});
      return;
    }

    const unsubscribers = [];

    if (userRole === 'msme') {
      // ── Verification Status: invoices currently being verified ──
      const qVerify = query(
        collection(db, 'invoices'),
        where('msmeId', '==', user.uid),
        where('status', 'in', ['verifying', 'pending'])
      );
      unsubscribers.push(
        onSnapshot(qVerify, (snap) => {
          setBadges(prev => ({ ...prev, '/msme/verification': snap.size }));
        })
      );

      // ── Funding Offers: invoices with bids awaiting acceptance ──
      const qOffers = query(
        collection(db, 'invoices'),
        where('msmeId', '==', user.uid),
        where('status', '==', 'bidding')
      );
      unsubscribers.push(
        onSnapshot(qOffers, (snap) => {
          setBadges(prev => ({ ...prev, '/msme/offers': snap.size }));
        })
      );

      // ── Receive Money: funds in escrow ready to withdraw ──
      const qEscrow = query(
        collection(db, 'invoices'),
        where('msmeId', '==', user.uid),
        where('status', '==', 'escrow_funded')
      );
      unsubscribers.push(
        onSnapshot(qEscrow, (snap) => {
          setBadges(prev => ({ ...prev, '/msme/receive': snap.size }));
        })
      );
    }

    if (userRole === 'buyer') {
      // ── Confirm Invoice: invoices pending buyer confirmation ──
      const qConfirm = query(
        collection(db, 'invoices'),
        where('status', 'in', ['pending', 'verifying', 'verified'])
      );
      unsubscribers.push(
        onSnapshot(qConfirm, (snap) => {
          // Only count invoices not yet confirmed or disputed
          const pending = snap.docs.filter(d => {
            const data = d.data();
            return !data.buyerConfirmed && !data.buyerDisputed;
          });
          setBadges(prev => ({ ...prev, '/buyer/confirm': pending.length }));
        })
      );

      // ── Make Payment: invoices with payments due ──
      const qPayment = query(
        collection(db, 'invoices'),
        where('status', 'in', ['verified', 'accepted', 'funded', 'escrow_funded'])
      );
      unsubscribers.push(
        onSnapshot(qPayment, (snap) => {
          setBadges(prev => ({ ...prev, '/buyer/payment': snap.size }));
        })
      );
    }

    if (userRole === 'funder') {
      // ── Available Invoices: invoices to bid on + pending disbursements ──
      const qAvailable = query(
        collection(db, 'invoices'),
        where('status', 'in', ['verified', 'bidding'])
      );
      const qDisburse = query(
        collection(db, 'invoices'),
        where('status', '==', 'accepted')
      );

      // Track both counts and combine them
      let availableCount = 0;
      let disburseCount = 0;

      unsubscribers.push(
        onSnapshot(qAvailable, (snap) => {
          availableCount = snap.size;
          setBadges(prev => ({ ...prev, '/funder/invoices': availableCount + disburseCount }));
        })
      );

      unsubscribers.push(
        onSnapshot(qDisburse, (snap) => {
          // Only count invoices where this funder was accepted
          disburseCount = snap.docs.filter(d => {
            const data = d.data();
            return data.acceptedFunder?.funderId === user.uid;
          }).length;
          setBadges(prev => ({ ...prev, '/funder/invoices': availableCount + disburseCount }));
        })
      );

      // ── Portfolio: escrow funds ready for funder withdrawal ──
      const qEscrowReady = query(
        collection(db, 'invoices'),
        where('status', '==', 'escrow_settled')
      );
      unsubscribers.push(
        onSnapshot(qEscrowReady, (snap) => {
          const readyToWithdraw = snap.docs.filter(d => {
            const data = d.data();
            return data.acceptedFunder?.funderId === user.uid;
          }).length;
          setBadges(prev => ({ ...prev, '/funder/portfolio': readyToWithdraw }));
        })
      );
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, userRole]);

  return (
    <NotificationContext.Provider value={badges}>
      {children}
    </NotificationContext.Provider>
  );
}
