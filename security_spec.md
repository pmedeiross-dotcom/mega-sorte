# Security Specification - Mega Sorte Cloud Bets

## 1. Data Invariants
1. **User Identity Isolation**: A user can only read, create, update, or delete documents within `/users/{userId}/**` where `{userId}` strictly matches `request.auth.uid`.
2. **Verified Authenticated Writes**: Write operations must come from authenticated users (`request.auth != null`).
3. **Bet Document Integrity**:
   - Every bet must belong to the authenticated owner (`incoming().userId == request.auth.uid` and path variable `userId == request.auth.uid`).
   - The document ID `{betId}` must be a valid alphanumeric string up to 128 characters.
   - `numbers` must be an array of length between 6 and 15 elements with valid numeric values.
   - `createdAt` must be numeric timestamp and immutable on updates.
   - `userId` must be immutable on updates.
4. **Denial-of-Service / Wallet Exhaustion Protection**:
   - `reasoning` is bounded to at most 3000 characters.
   - Schema keys are strictly guarded to prevent shadow/ghost fields injection.
5. **Default Deny**: All other collections and paths are strictly blocked from read and write.

---

## 2. The "Dirty Dozen" Payloads (Attacks designed to break identity, integrity, and state)

1. **Payload 1 - Cross-User Read**: Unauthenticated or unauthorized user attempting `get /users/userA/bets/bet1`.
2. **Payload 2 - Impersonated Bet Write**: User B attempting to create a bet inside `/users/userA/bets/betX`.
3. **Payload 3 - Spoofed Internal userId**: User A writing to `/users/userA/bets/bet1` with `userId: "userB"`.
4. **Payload 4 - Shadow Field Injection**: Writing a bet with ghost field `isAdmin: true` or `unauthorizedField: "hacked"`.
5. **Payload 5 - Huge String Payload Attack**: Writing `reasoning` of size > 100,000 characters to bloat database storage.
6. **Payload 6 - Malformed Numbers Array**: Setting `numbers: "not-an-array"` or an empty list `numbers: []`.
7. **Payload 7 - Out-of-Bounds Numbers Count**: Setting `numbers` with 25 lottery balls (limit is 15 max).
8. **Payload 8 - Path Poisoning**: Attempting to write with document ID `betId: "../../../admins/secret"`.
9. **Payload 9 - Immutable Field Mutation**: Attempting an update to alter `userId` or `createdAt` on an existing bet.
10. **Payload 10 - Blanket List Extraction**: An unauthorized user attempting to list `/users/userA/bets`.
11. **Payload 11 - Root Collection Scraping**: Querying root catch-all collection `/{document=**}`.
12. **Payload 12 - Unauthenticated Write**: An anonymous/unauthenticated guest trying to `setDoc` on `/users/anon/bets/bet1`.

---

## 3. Test Runner
See `firestore.rules.test.ts` for automated security test definitions ensuring all 12 malicious payloads receive `PERMISSION_DENIED`.
