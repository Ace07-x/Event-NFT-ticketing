# Future Scope & Roadmap

A comprehensive list of planned improvements, feature additions, and architectural upgrades for this event ticketing dApp, derived from its current limitations and real-world ticketing requirements.

---

## 🚀 Phase 1 — Production Readiness (Critical Fixes)

### 1. Real Wallet Integration (MetaMask / WalletConnect)
Replace the hardcoded private key with proper wallet provider support using MetaMask, WalletConnect, or Coinbase Wallet via `ethers.BrowserProvider`. This is a prerequisite for any public deployment.

**Implementation:** Replace `ethers.Wallet(privateKey, provider)` with `new ethers.BrowserProvider(window.ethereum)`.

### 2. Public Testnet / Mainnet Deployment
Deploy to a public network (Sepolia testnet first, then Ethereum mainnet or an L2 like Polygon/Arbitrum) and update `hardhat.config.js` with the appropriate RPC URLs and wallet credentials stored securely via environment variables.

### 3. Environment-Based Configuration
Move all sensitive config (RPC URLs, contract addresses, API keys) out of source code and into `.env` files, never committed to version control.

### 4. Smart Contract Audit
Before any mainnet deployment, commission a professional security audit of `EventTicket.sol` to catch reentrancy risks, access control issues, and edge cases.

---

## 🏗️ Phase 2 — Multi-Event Architecture

### 5. EventFactory Contract
Introduce a factory pattern — a top-level `EventFactory.sol` contract that deploys individual `EventTicket` contracts per event. This enables:
- Unlimited events on a single platform
- Per-event ownership and organizer control
- A unified platform registry of all events

```solidity
// Conceptual API
function createEvent(
    string memory name,
    string memory symbol,
    uint256 generalPrice,
    uint256 vipPrice,
    uint256 maxTickets,
    uint256 eventDate
) external returns (address eventContract);
```

### 6. Rich On-Chain Event Metadata
Add structured event metadata to each contract: event name, description, venue, date/time, and organizer info — all stored on-chain and queryable by the frontend.

### 7. Date-Gating & Sale Windows
Enforce sale windows on-chain using `block.timestamp`:
- Primary sale start/end dates
- Resale market open/close windows
- Automatic ticket expiry post-event

---

## 🛡️ Phase 3 — Security & Access Control

### 8. Role-Based Access Control (RBAC)
Integrate OpenZeppelin `AccessControl` to support multiple roles:
- `ORGANIZER_ROLE` — can update prices, pause sales
- `VERIFIER_ROLE` — can scan/validate tickets at entry
- `ADMIN_ROLE` — platform-level control

### 9. Pausable Contract (Emergency Stop)
Add OpenZeppelin `Pausable` to allow the organizer to halt all minting and resale activity in an emergency (e.g., event cancellation, security incident).

### 10. Per-Wallet Purchase Limits
Enforce a maximum ticket count per wallet address to prevent bot-driven bulk purchases and scalping:

```solidity
mapping(address => uint256) public ticketsPurchasedBy;
uint256 public maxTicketsPerWallet = 4;
```

### 11. Configurable Resale Parameters
Allow the organizer to update `maxResaleMarkupPercentage` and `organizerRoyaltyPercentage` post-deployment (within safe bounds), rather than fixing them at construction time.

---

## 🎟️ Phase 4 — Core Ticketing Features

### 12. Ticket Validation at Entry (Scan & Use)
Add a `useTicket(uint256 tokenId)` function callable only by wallets with the `VERIFIER_ROLE`. This marks a ticket as used and prevents re-entry, completing the fundamental ticketing loop.

```solidity
mapping(uint256 => bool) public isTicketUsed;

function useTicket(uint256 tokenId) external onlyRole(VERIFIER_ROLE) {
    require(!isTicketUsed[tokenId], "Ticket already used");
    isTicketUsed[tokenId] = true;
    emit TicketUsed(tokenId, block.timestamp);
}
```

### 13. Resale Delisting
Add a `delistFromResale(uint256 tokenId)` function so sellers can withdraw their resale listing at any time before it is purchased.

### 14. Multiple Ticket Tiers
Expand beyond just `General` and `VIP` to support configurable tiers (e.g., Early Bird, Backstage, Premium, Student) with individual price caps, supply limits, and metadata.

### 15. Seat / Section Assignment
Assign specific seat numbers, rows, or sections at the time of minting, stored as ticket metadata attributes — enabling seat-mapped venue layouts in the frontend.

### 16. Organizer Refund Mechanism
Allow organizers to trigger a full refund mode (e.g., if an event is cancelled), enabling all ticket holders to burn their NFT and claim back the original purchase price.

---

## 🖼️ Phase 5 — Decentralized Storage & Metadata

### 17. IPFS / Arweave for Metadata
Replace inline base64 `data:` URIs with IPFS or Arweave content-addressed URIs. This dramatically reduces on-chain storage costs and enables rich, updatable metadata.

**Workflow:**
1. Upload image and JSON metadata to IPFS (e.g., via Pinata or NFT.Storage)
2. Store the resulting `ipfs://` CID as the token URI

### 18. Dynamic NFT Metadata
Evolve ticket NFTs to reflect real-world state — e.g., the image updates after the event is attended ("Used" stamp), or gains a commemorative badge. Achievable via updatable IPFS metadata or on-chain SVG generation.

---

## 🌐 Phase 6 — Resale Marketplace

### 19. On-Chain Resale Listing Registry
Add a public mapping or event log to enumerate all active resale listings, enabling the frontend to render a live marketplace of available tickets.

```solidity
uint256[] public activeResaleListings;
```

### 20. Resale Marketplace UI
Build a dedicated "Marketplace" tab in the frontend where any connected wallet can browse available resale tickets by event, type, and price — and purchase them directly.

### 21. Royalty Splitting
Replace the single-owner royalty with a configurable multi-recipient royalty split (e.g., organizer 7%, platform 3%), implemented via a payment splitter contract.

---

## ⛽ Phase 7 — Scalability & Cost Reduction

### 22. Layer 2 Deployment (Polygon / Arbitrum / Base)
Deploy on an Ethereum L2 to reduce gas fees by 10–100x, making ticket purchases economically viable for everyday users. Polygon PoS and Arbitrum One are mature, production-ready targets.

### 23. Gasless Transactions (Meta-Transactions)
Implement EIP-2771 meta-transactions so the platform can sponsor gas fees on behalf of users — removing the need for buyers to hold ETH/MATIC at all.

### 24. Batch Minting
Allow group/bulk ticket purchases in a single transaction to reduce gas overhead for event organizers distributing complimentary tickets.

---

## 📊 Phase 8 — Analytics & Integrations

### 25. On-Chain Analytics Dashboard
Track and display: total tickets sold, revenue generated, resale volume, royalties earned, and wallet distribution — all sourced directly from on-chain events.

### 26. Etherscan / Block Explorer Integration
Use the Etherscan API (already configured in `hardhat.config.js`) to verify the contract and link transaction hashes to a real explorer, giving users full transparency.

### 27. OpenSea / NFT Marketplace Compatibility
Ensure the contract is fully ERC-721 compliant with proper metadata standards, making tickets automatically discoverable and tradeable on OpenSea and other NFT marketplaces.

### 28. QR Code Ticket Scanner App
Build a companion mobile/web app for event staff to scan a wallet-signed QR code at the venue gate, which calls `useTicket()` on-chain via the `VERIFIER_ROLE`.

---

## Priority Roadmap Summary

| Phase | Feature | Value |
|-------|---------|-------|
| 1 | Real wallet integration (MetaMask) | 🔴 Unblocks all real users |
| 1 | Public testnet/mainnet deployment | 🔴 Unblocks production use |
| 2 | EventFactory (multi-event) | 🟠 Core scalability |
| 3 | Per-wallet purchase limit | 🟠 Anti-scalper protection |
| 4 | Ticket validation at entry | 🟠 Core ticketing feature |
| 4 | Resale delisting | 🟠 Seller UX |
| 5 | IPFS metadata storage | 🟡 Cost & decentralization |
| 6 | Resale marketplace UI | 🟡 Secondary market |
| 7 | L2 deployment (Polygon/Arbitrum) | 🟡 Gas cost reduction |
| 8 | QR code scanner app | 🟢 Operational tooling |
| 8 | OpenSea compatibility | 🟢 Ecosystem reach |
| 7 | Gasless transactions | 🟢 Premium UX |
