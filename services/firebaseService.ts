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
import { Bet } from '../types';

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
      createdAt: bet.createdAt || Date.now(),
      type: bet.type,
      sum: bet.sum,
      sumStatus: bet.sumStatus
    };

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

export const subscribeToCloudBets = (
  userId: string,
  onUpdate: (bets: Bet[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const path = `users/${userId}/bets`;
  const betsCollection = collection(db, 'users', userId, 'bets');

  return onSnapshot(
    betsCollection,
    (snapshot) => {
      const bets: Bet[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Bet;
        bets.push({
          ...data,
          id: docSnapshot.id,
          isCloudSynced: true
        });
      });
      // Sort newest first
      bets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(bets);
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

export const syncAllLocalBetsToCloud = async (userId: string, localBets: Bet[]): Promise<number> => {
  let syncedCount = 0;
  for (const bet of localBets) {
    try {
      await saveBetToCloud(userId, bet);
      syncedCount++;
    } catch (e) {
      console.warn(`Erro ao sincronizar aposta ${bet.id}:`, e);
    }
  }
  return syncedCount;
};
