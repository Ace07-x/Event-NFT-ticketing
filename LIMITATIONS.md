# Blockchain & dApp Limitations

A comprehensive list of known limitations of this event ticketing dApp, covering the smart contract, infrastructure, and business logic layers.

---

## 🔒 Smart Contract Limitations

### 1. Single Contract = Single Event
The contract has one `maxTickets`, `generalPrice`, and `vipPrice`. You cannot host multiple events without redeploying a new contract each time.

### 2. No Event Metadata
There is no event name, date, venue, or description stored on-chain. These are critical fields for a real-world ticketing system.

### 3. No Ticket Cancellation / Refunds
Once a ticket is minted, there is no `cancel()` or `refund()` mechanism. The organizer cannot revoke tickets or issue refunds to buyers.

### 4. No Seat / Tier Assignments
Beyond `General` and `VIP`, there is no concept of seat numbers, sections, rows, or time slots.

### 5. No Per-Wallet Purchase Limit
A single wallet can buy unlimited tickets (up to `maxTickets`), enabling bulk-buying bots or scalpers to monopolize supply.

### 6. Hardcoded Resale Markup Cap
`maxResaleMarkupPercentage = 120` is set at deploy time and cannot be updated by the owner after deployment.

### 7. No Resale Delisting
Once a ticket is listed for resale via `listForResale()`, there is no `delistFromResale()` function. The seller cannot cancel their listing — it stays active until someone buys it.

### 8. No Pause / Emergency Stop
There is no circuit breaker (e.g., OpenZeppelin `Pausable`) to halt minting or resales in an emergency.

### 9. No Date-Gating
Tickets can be minted or resold at any time. There is no on-chain enforcement of sale windows, event start dates, or expiry.

### 10. Single Organizer (Owner Only)
There is no role-based access control (e.g., OpenZeppelin `AccessControl`) for multiple co-organizers or admins. All privileged actions are restricted to the single deployer wallet.

---

## 🌐 Infrastructure / Network Limitations

### 11. Local-Only (Hardhat Node)
The app is configured for `http://127.0.0.1:8545` and only works on a local Hardhat node. Deploying to a public testnet (e.g., Sepolia) or Ethereum mainnet would require real ETH and significant config changes.

### 12. Hardcoded Private Key in Frontend
`main.js` hardcodes the Hardhat default account #0 private key directly in client-side JavaScript. This is catastrophically insecure and must never be used in any real or public deployment.

### 13. No MetaMask / External Wallet Support
The app bypasses real wallet providers entirely and uses a hardcoded `ethers.Wallet`. Real users cannot connect their own wallets (MetaMask, WalletConnect, etc.).

### 14. Ethereum Gas Costs
Every ticket purchase, resale listing, and resale purchase requires a gas fee. On Ethereum mainnet, these costs can be prohibitively expensive for end-users.

### 15. Token URI Stored On-Chain (base64)
The SVG and JSON metadata is stored directly as a `data:` URI in contract storage via `_setTokenURI`. This is extremely gas-inefficient for anything beyond small payloads. IPFS or Arweave would be far more appropriate.

### 16. No Decentralized Storage (No IPFS)
Metadata and images are inline base64 strings. There is no use of IPFS or another decentralized storage layer, which means metadata integrity depends entirely on the contract itself.

---

## 🧑‍💼 Business Logic Limitations

### 17. No Ticket Validation at Entry
There is no on-chain `useTicket()` or `scanTicket()` function to mark a ticket as consumed/used. An NFT owner could theoretically reuse the same ticket multiple times at an event.

### 18. Resale Royalty Only Goes to Contract Owner
The `organizerRoyaltyPercentage` (10%) always goes to the deployer via `owner()`. There is no mechanism to split royalties between multiple stakeholders (e.g., artists, venues, platforms).

### 19. No Secondary Market Discovery
The contract has no way to enumerate all active resale listings on-chain. The frontend cannot build a marketplace view showing all available tickets for resale.

### 20. Ticket Price Fixed in ETH (No Fiat Pegging)
Prices are denominated in `wei`. There is no USD/fiat pegging, so the real-world cost of a ticket fluctuates directly with the ETH price — making pricing unpredictable for buyers.

---

## Priority Summary

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 Critical | Hardcoded private key in frontend (#12) | Security catastrophe in any real deployment |
| 🔴 Critical | No MetaMask / wallet support (#13) | Real users cannot interact with the dApp |
| 🔴 Critical | Local-only infrastructure (#11) | App is not deployable publicly |
| 🟠 High | No ticket validation at entry (#17) | Core ticketing functionality is missing |
| 🟠 High | No resale delisting (#7) | Sellers are permanently locked into listings |
| 🟠 High | Single contract = single event (#1) | Not scalable for real use |
| 🟡 Medium | No event metadata (#2) | Poor user experience |
| 🟡 Medium | No per-wallet purchase limit (#5) | Scalper vulnerability |
| 🟡 Medium | No pause / emergency stop (#8) | No incident response mechanism |
| 🟡 Medium | No secondary market discovery (#19) | No resale marketplace possible |
| 🟢 Low | Gas costs on mainnet (#14) | Mitigated by using L2s (e.g., Polygon, Arbitrum) |
| 🟢 Low | On-chain base64 metadata (#15) | Inefficient but functional at small scale |
