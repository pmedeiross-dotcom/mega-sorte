/**
 * Security Rule Test Suite for Mega Sorte
 * Validates that all Dirty Dozen payloads fail with PERMISSION_DENIED.
 */

export interface TestPayloadAssertion {
  name: string;
  expectedStatus: 'PERMISSION_DENIED' | 'ALLOWED';
  authUid: string | null;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
}

export const dirtyDozenTests: TestPayloadAssertion[] = [
  {
    name: '1. Cross-User Read',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'attacker_uid',
    path: 'users/victim_uid/bets/bet_123',
    operation: 'get'
  },
  {
    name: '2. Impersonated Bet Write',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'attacker_uid',
    path: 'users/victim_uid/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'victim_uid', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low' }
  },
  {
    name: '3. Spoofed Internal userId',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'userB', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low' }
  },
  {
    name: '4. Shadow Field Injection',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'userA', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low', isAdmin: true }
  },
  {
    name: '5. Huge String Payload Attack',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'userA', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low', reasoning: 'a'.repeat(4000) }
  },
  {
    name: '6. Malformed Numbers Array',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'userA', numbers: [], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low' }
  },
  {
    name: '7. Out-of-Bounds Numbers Count',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'userA', numbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], createdAt: 123456, type: 'manual', sum: 136, sumStatus: 'low' }
  },
  {
    name: '8. Path Poisoning',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/invalid@id!#$',
    operation: 'create',
    data: { id: 'invalid@id!#$', userId: 'userA', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low' }
  },
  {
    name: '9. Immutable Field Mutation (userId change)',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'users/userA/bets/bet_123',
    operation: 'update',
    data: { userId: 'userB' }
  },
  {
    name: '10. Blanket List Extraction',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'attacker_uid',
    path: 'users/victim_uid/bets',
    operation: 'list'
  },
  {
    name: '11. Root Collection Scraping',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: 'userA',
    path: 'admins',
    operation: 'list'
  },
  {
    name: '12. Unauthenticated Write',
    expectedStatus: 'PERMISSION_DENIED',
    authUid: null,
    path: 'users/anon/bets/bet_123',
    operation: 'create',
    data: { id: 'bet_123', userId: 'anon', numbers: [1,2,3,4,5,6], createdAt: 123456, type: 'manual', sum: 21, sumStatus: 'low' }
  }
];
