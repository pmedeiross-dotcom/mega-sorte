import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Bet, LotteryType } from '../types';

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Sync user document
    if (result.user) {
      await saveUserProfile(result.user);
    }
    return result.user;
  } catch (error) {
    console.error("Erro ao autenticar com Google:", error);
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

export const saveUserProfile = async (user: User): Promise<void> => {
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const profilePayload: Record<string, any> = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Apostador Mega Sorte',
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, profilePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Sanitizes object payload removing any undefined keys so Firestore doesn't throw.
 */
function sanitizeForFirestore(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

export const saveBetToCloud = async (userId: string, bet: Bet): Promise<void> => {
  const path = `users/${userId}/bets/${bet.id}`;
  try {
    const betDocRef = doc(db, 'users', userId, 'bets', bet.id);
    const betPayload: Record<string, any> = {
      id: bet.id,
      userId: userId,
      numbers: bet.numbers,
      lottery: bet.lottery || 'megasena',
      createdAt: bet.createdAt || Date.now(),
      type: bet.type,
      sum: bet.sum,
      sumStatus: bet.sumStatus
    };

    if (bet.trevos && Array.isArray(bet.trevos) && bet.trevos.length >= 2) {
      betPayload.trevos = bet.trevos.slice(0, 5);
    }
    if (bet.reasoning) {
      betPayload.reasoning = bet.reasoning.substring(0, 3000);
    }
    if (bet.advancedMetrics) {
      betPayload.advancedMetrics = bet.advancedMetrics;
    }
    if (bet.groundingUrls && Array.isArray(bet.groundingUrls)) {
      betPayload.groundingUrls = bet.groundingUrls.slice(0, 20);
    }
    if (bet.analysis) {
      betPayload.analysis = bet.analysis;
    }

    const cleanPayload = sanitizeForFirestore(betPayload);
    await setDoc(betDocRef, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteBetFromCloud = async (userId: string, betId: string): Promise<void> => {
  const path = `users/${userId}/bets/${betId}`;
  try {
    const betDocRef = doc(db, 'users', userId, 'bets', betId);
    await deleteDoc(betDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

function normalizeLottery(raw: unknown): LotteryType {
  if (typeof raw !== 'string') return 'megasena';
  const v = raw.toLowerCase().trim();
  if (v === 'lotofacil' || v === 'loto-facil') return 'lotofacil';
  if (v === 'maismilionaria' || v === 'mais-milionaria') return 'maismilionaria';
  return 'megasena';
}

function normalizeCreatedAt(raw: unknown): number {
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const ts = raw as { toMillis?: () => number; seconds?: number };
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  }
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function normalizeCloudBet(docId: string, data: Record<string, any>): Bet {
  const numbers = Array.isArray(data.numbers)
    ? data.numbers.map((n: any) => Number(n)).filter((n: number) => !isNaN(n))
    : [];
  const computedSum = numbers.reduce((acc: number, n: number) => acc + n, 0);

  return {
    ...(data as Bet),
    id: docId,
    numbers,
    lottery: normalizeLottery(data.lottery),
    createdAt: normalizeCreatedAt(data.createdAt),
    sum: typeof data.sum === 'number' && !isNaN(data.sum) ? data.sum : computedSum,
    sumStatus: data.sumStatus === 'low' || data.sumStatus === 'high' ? data.sumStatus : 'ideal',
    type: data.type === 'manual' || data.type === 'random' || data.type === 'ai' ? data.type : 'smart_rules',
    isCloudSynced: true
  };
}

export const fetchCloudBetsOnce = async (userId: string): Promise<Bet[]> => {
  const path = `users/${userId}/bets`;
  const betsCollection = collection(db, 'users', userId, 'bets');
  try {
    const snapshot = await getDocs(betsCollection);
    const bets: Bet[] = [];
    snapshot.forEach((docSnapshot) => {
      bets.push(normalizeCloudBet(docSnapshot.id, docSnapshot.data() as Record<string, any>));
    });
    bets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return bets;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const subscribeToCloudBets = (
  userId: string,
  onUpdate: (bets: Bet[], meta?: { fromCache: boolean }) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const path = `users/${userId}/bets`;
  const betsCollection = collection(db, 'users', userId, 'bets');

  return onSnapshot(
    betsCollection,
    (snapshot) => {
      const bets: Bet[] = [];
      snapshot.forEach((docSnapshot) => {
        bets.push(normalizeCloudBet(docSnapshot.id, docSnapshot.data() as Record<string, any>));
      });
      // Sort newest first
      bets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(bets, { fromCache: snapshot.metadata.fromCache });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
};

export const syncAllLocalBetsToCloud = async (
  userId: string,
  localBets: Bet[],
  existingCloudIds?: Set<string>
): Promise<number> => {
  const betsToUpload = existingCloudIds
    ? localBets.filter((b) => !existingCloudIds.has(b.id))
    : localBets;

  let syncedCount = 0;
  const CHUNK_SIZE = 15;
  for (let i = 0; i < betsToUpload.length; i += CHUNK_SIZE) {
    const chunk = betsToUpload.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((bet) => saveBetToCloud(userId, bet))
    );
    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        syncedCount++;
      } else {
        console.warn(`Erro ao sincronizar aposta ${chunk[idx]?.id}:`, res.reason);
      }
    });
  }
  return syncedCount;
};
