# How This Blockchain dApp Works — From the Beginning

A complete, step-by-step explanation of how this event ticketing system works, from writing the smart contract to a user buying a ticket in the browser. No blockchain knowledge assumed.

---

## Table of Contents

1. [What Is a Blockchain?](#1-what-is-a-blockchain)
2. [What Is a Smart Contract?](#2-what-is-a-smart-contract)
3. [What Is an NFT Ticket?](#3-what-is-an-nft-ticket)
4. [Project Architecture Overview](#4-project-architecture-overview)
5. [Step 1 — Writing the Smart Contract](#5-step-1--writing-the-smart-contract)
6. [Step 2 — Compiling the Contract](#6-step-2--compiling-the-contract)
7. [Step 3 — Running a Local Blockchain (Hardhat Node)](#7-step-3--running-a-local-blockchain-hardhat-node)
8. [Step 4 — Deploying the Contract](#8-step-4--deploying-the-contract)
9. [Step 5 — The Frontend Connects to the Blockchain](#9-step-5--the-frontend-connects-to-the-blockchain)
10. [Step 6 — Buying a Ticket (Primary Sale)](#10-step-6--buying-a-ticket-primary-sale)
11. [Step 7 — What Happens Inside purchaseTicket()](#11-step-7--what-happens-inside-purchaseticket)
12. [Step 8 — The Ticket as an NFT (ERC-721)](#12-step-8--the-ticket-as-an-nft-erc-721)
13. [Step 9 — Viewing Your Tickets](#13-step-9--viewing-your-tickets)
14. [Step 10 — Resale Market Flow](#14-step-10--resale-market-flow)
15. [Step 11 — Verifying a Ticket](#15-step-11--verifying-a-ticket)
16. [Step 12 — Organizer Withdraws Revenue](#16-step-12--organizer-withdraws-revenue)
17. [Data Flow Diagram](#17-data-flow-diagram)
18. [Key Contracts, Files & Their Roles](#18-key-contracts-files--their-roles)
19. [Glossary](#19-glossary)

---

## 1. What Is a Blockchain?

A **blockchain** is a shared, tamper-proof database spread across many computers. Instead of a central company owning the data, thousands of nodes (computers) each hold an identical copy. Every change to the database (a "transaction") is bundled into a "block" and permanently chained to all previous blocks — hence "blockchain".

Key properties relevant to this project:
- **Immutable** — once a ticket is minted, it cannot be silently deleted or altered.
- **Transparent** — anyone can inspect every transaction and contract on-chain.
- **Trustless** — the rules (ticket price, resale cap, royalty %) are enforced by code, not by a person.

This project runs on **Ethereum** (or a local simulation of it).

---

## 2. What Is a Smart Contract?

A **smart contract** is a program that lives permanently on the blockchain. It has:
- **State** — variables stored on-chain (e.g., who owns which ticket, the ticket price).
- **Functions** — callable actions (e.g., `purchaseTicket`, `listForResale`).
- **Rules** — `require()` statements that reject invalid calls automatically.

Once deployed, no one (not even the deployer) can change the code. The contract at address `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` is the single source of truth for all ticket ownership.

---

## 3. What Is an NFT Ticket?

An **NFT (Non-Fungible Token)** is a unique digital asset on the blockchain. Unlike ETH (where all coins are identical), each NFT has a unique ID and owner.

This project uses the **ERC-721** standard — the most widely used NFT standard on Ethereum. Each ticket is an ERC-721 token with:
- A unique **Token ID** (0, 1, 2, 3, …)
- A **owner address** (the buyer's wallet)
- A **Token URI** — a link/data blob describing the ticket's metadata (name, image, type)

---

## 4. Project Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│   index.html ──── main.js ──── ethers.js (v6.17.0)             │
│       UI           Logic         Blockchain Bridge              │
└────────────────────────────┬────────────────────────────────────┘
                             │  JSON-RPC over HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              LOCAL HARDHAT NODE  (port 8545)                    │
│                                                                 │
│   Simulates Ethereum blockchain locally                         │
│   Provides 20 test wallets pre-loaded with 10,000 ETH each      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         EventTicket.sol  (Deployed Smart Contract)              │
│                                                                 │
│   Inherits:  ERC721URIStorage + Ownable (OpenZeppelin)          │
│   Address:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512        │
│   State:     ticket ownership, prices, resale listings          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Step 1 — Writing the Smart Contract

**File:** `contracts/EventTicket.sol`

The contract is written in **Solidity** (v0.8.28) — a statically typed language designed specifically for Ethereum smart contracts.

It imports three battle-tested components from **OpenZeppelin**:

| Import | Purpose |
|--------|---------|
| `ERC721.sol` | The base NFT standard — handles token ownership, transfers, approvals |
| `ERC721URIStorage.sol` | Extends ERC721 to store a metadata URI per token |
| `Ownable.sol` | Adds an `owner` address and `onlyOwner` modifier for admin functions |

**Key state variables defined:**

```solidity
uint256 public generalPrice;          // 0.01 ETH — price for General tickets
uint256 public vipPrice;              // 0.05 ETH — price for VIP tickets
uint256 public maxTickets;            // 100 — total supply cap
uint256 public maxResaleMarkupPercentage = 120;  // resale cap: 120% of original
uint256 public organizerRoyaltyPercentage = 10;  // 10% royalty on every resale

mapping(uint256 => ResaleListing) public resaleListings;     // active resale listings
mapping(uint256 => uint256) public originalTicketPrices;     // price each ticket was minted at
mapping(uint256 => TicketType) public ticketTypes;           // General or VIP

// O(1) owner tracking (no expensive loops)
mapping(address => uint256[]) private _ownerTokens;
mapping(uint256 => uint256) private _tokenIndexInOwner;
```

---

## 6. Step 2 — Compiling the Contract

**Tool:** Hardhat (v2.29.0)

```bash
npx hardhat compile
```

Hardhat reads `contracts/EventTicket.sol` and:
1. Passes it through the **Solidity compiler** (`solc v0.8.28`)
2. Produces two outputs in the `artifacts/` folder:
   - **Bytecode** — the raw machine code the EVM (Ethereum Virtual Machine) will execute
   - **ABI (Application Binary Interface)** — a JSON description of every function, event, and input/output type in the contract

The **ABI** is what the frontend uses to know how to call the contract. It is copied to `frontend/abi.js` and imported by `main.js`.

---

## 7. Step 3 — Running a Local Blockchain (Hardhat Node)

**Tool:** Hardhat Network

```bash
npx hardhat node
```

This starts a local Ethereum simulator on `http://127.0.0.1:8545`. It:
- Mines blocks instantly (no waiting for real consensus)
- Creates **20 test accounts**, each pre-loaded with 10,000 ETH
- Account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) is the **organizer/deployer**
- Its private key is `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (used in `main.js`)

The frontend's faucet button (`+100 TIX`) calls the Hardhat-only `hardhat_setBalance` JSON-RPC method to top up the wallet to 1,000 ETH — this only works on a local Hardhat node, not on any real network.

---

## 8. Step 4 — Deploying the Contract

**Tool:** Hardhat Ignition  
**File:** `ignition/modules/EventTicket.js`

```bash
npx hardhat ignition deploy ignition/modules/EventTicket.js --network localhost
```

The Ignition module defines the constructor arguments:

```js
const name        = "Tech Conference 2026"   // ERC-721 collection name
const symbol      = "TECH26"                 // ERC-721 ticker symbol
const generalPrice = 10000000000000000n      // 0.01 ETH in wei
const vipPrice     = 50000000000000000n      // 0.05 ETH in wei
const maxTickets   = 100                     // total supply cap
```

**What happens during deployment:**
1. Hardhat builds a deployment transaction containing the contract bytecode + encoded constructor args
2. It sends this transaction from Account #0 (the organizer wallet)
3. The Hardhat node mines it into a block
4. The EVM executes the constructor, initialising all state variables
5. The contract is permanently assigned a unique address (e.g., `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`)
6. Ignition writes the deployment receipt to `ignition/deployments/`

That address is then hardcoded in `frontend/main.js` as `CONTRACT_ADDRESS`.

---

## 9. Step 5 — The Frontend Connects to the Blockchain

**File:** `frontend/main.js`  
**Library:** ethers.js v6.17.0

When the page loads, `init()` runs:

```js
// 1. Create a read-only JSON-RPC connection to the local Hardhat node
readProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// 2. Create a wallet (signer) using Hardhat Account #0's private key
signer = new ethers.Wallet(privateKey, readProvider);

// 3. Create a contract instance — binds the ABI + address + signer together
eventTicketContract = new ethers.Contract(CONTRACT_ADDRESS, EventTicketABI, signer);
```

The `eventTicketContract` object is the JavaScript gateway to the smart contract. Calling `eventTicketContract.purchaseTicket(...)` automatically:
- Encodes the function call using the ABI
- Signs the transaction with the signer's private key
- Sends it to the Hardhat node over HTTP
- Returns a transaction receipt when it's mined

---

## 10. Step 6 — Buying a Ticket (Primary Sale)

**User flow:**
1. User clicks **"Buy General"** or **"Buy VIP"** button
2. A confirmation modal appears showing the cost (0.01 or 0.05 TIX) and the user's current balance
3. User clicks **"Proceed"**
4. `mintTicket()` is called in `main.js`

```js
const tx = await eventTicketContract.purchaseTicket(
    type,   // 0 = General, 1 = VIP
    uri,    // base64-encoded JSON metadata (name, image as SVG)
    { value: price }  // ETH sent with the transaction
);
const receipt = await tx.wait();  // waits for the block to be mined
```

The `{ value: price }` part attaches real ETH to the transaction — this is how the buyer pays.

---

## 11. Step 7 — What Happens Inside `purchaseTicket()`

Inside the smart contract on the EVM:

```solidity
function purchaseTicket(TicketType ticketType, string memory uri) external payable {
    // 1. Check supply hasn't run out
    require(_nextTokenId < maxTickets, "Sold out");

    // 2. Check exact price was sent (no over/underpayment)
    uint256 price = ticketType == TicketType.VIP ? vipPrice : generalPrice;
    require(msg.value == price, "Incorrect ticket price");

    // 3. Assign a token ID and increment the counter
    uint256 tokenId = _nextTokenId++;

    // 4. Record the original price and type for resale cap calculations later
    originalTicketPrices[tokenId] = price;
    ticketTypes[tokenId] = ticketType;

    // 5. Mint the NFT — assign ownership to the buyer's wallet
    _safeMint(msg.sender, tokenId);

    // 6. Attach the metadata URI to the token
    _setTokenURI(tokenId, uri);

    // 7. Emit an event so the frontend can read the new Token ID from the receipt
    emit TicketPurchased(msg.sender, tokenId, price);
}
```

The ETH sent (`msg.value`) stays locked inside the contract's balance until the organizer calls `withdraw()`.

**After the transaction:**
- The blockchain permanently records: Token #N is owned by wallet address X
- The frontend reads the `TicketPurchased` event from the receipt to extract the new Token ID
- The success message is shown in the UI with the Token ID and a "View & Verify" shortcut

---

## 12. Step 8 — The Ticket as an NFT (ERC-721)

The ticket metadata is stored entirely on-chain as a base64-encoded `data:` URI:

```
data:application/json;base64,eyJuYW1lIjoiR2VuZXJhbCBBZG1pc3Npb24iLCAi...
```

Decoded, this JSON looks like:
```json
{
  "name": "General Admission",
  "description": "Standard TicketX Pass",
  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0..."
}
```

The image itself is a hand-crafted SVG (defined in `main.js`) encoded as base64:
- **General ticket** — dark indigo gradient with a purple circle, "GENERAL ADMISSION" text
- **VIP ticket** — amber/deep purple gradient with a gold star polygon, "VIP PASS" text

This means the ticket art and metadata are 100% on-chain — no external server required.

**O(1) Ownership Tracking:**
The contract uses a custom `_update()` override (called on every mint and transfer) to maintain two mappings:
```solidity
mapping(address => uint256[])  private _ownerTokens;       // all tokens per wallet
mapping(uint256 => uint256)    private _tokenIndexInOwner; // token's position in that array
```
This allows `getTicketsByOwner(address)` to return all tickets in a single call without any on-chain loops — important for gas efficiency and avoiding stack overflow errors.

---

## 13. Step 9 — Viewing Your Tickets

When the user clicks the **"My Tickets"** tab:

1. `loadMyTickets()` calls `getTicketsByOwner(currentAccount)` — returns an array of Token IDs
2. For each Token ID, it calls `getTicketInfo(tokenId)` — returns type, original price, owner address, and URI
3. It calls `resaleListings(tokenId)` — checks if that ticket is currently listed for resale
4. It decodes the base64 URI to extract the SVG image
5. It renders a ticket card with all the details

All of this data comes directly from the blockchain — no backend database.

---

## 14. Step 10 — Resale Market Flow

### Listing a Ticket for Resale

A ticket owner calls `listForResale(tokenId, price)`:

```solidity
function listForResale(uint256 tokenId, uint256 price) external {
    // Only the owner can list their own ticket
    require(ownerOf(tokenId) == msg.sender, "Not the owner");

    // Price cannot exceed 120% of the original mint price (anti-scalping)
    uint256 maxPrice = (originalTicketPrices[tokenId] * maxResaleMarkupPercentage) / 100;
    require(price <= maxPrice, "Price exceeds maximum resale cap");

    resaleListings[tokenId] = ResaleListing({ isListed: true, price: price });
    emit TicketListedForResale(tokenId, price);
}
```

### Buying a Resale Ticket

A buyer calls `buyResaleTicket(tokenId)` with the exact listed price:

```solidity
function buyResaleTicket(uint256 tokenId) external payable {
    // 1. Verify the listing exists and the right amount was sent
    require(listing.isListed, "Ticket not listed for resale");
    require(msg.value == listing.price, "Incorrect price");

    address seller = ownerOf(tokenId);

    // 2. Calculate the 10% organizer royalty
    uint256 royalty         = (msg.value * organizerRoyaltyPercentage) / 100;
    uint256 sellerProceeds  = msg.value - royalty;

    // 3. Clear the listing before transferring (prevents re-entrancy)
    delete resaleListings[tokenId];

    // 4. Transfer NFT ownership from seller to buyer
    _transfer(seller, msg.sender, tokenId);

    // 5. Pay the seller (90% of resale price)
    payable(seller).call{value: sellerProceeds}("");

    // 6. Pay the organizer royalty (10% of resale price)
    payable(owner()).call{value: royalty}("");

    emit TicketResold(seller, msg.sender, tokenId, msg.value, royalty);
}
```

**Money flow on a 0.012 ETH resale:**
```
Buyer sends:   0.012 ETH
  └─► Seller receives:    0.0108 ETH  (90%)
  └─► Organizer royalty:  0.0012 ETH  (10%)
```

---

## 15. Step 11 — Verifying a Ticket

The **Verify** tab lets anyone (e.g., an event gate attendant) enter a Token ID and see:
- Who currently owns it
- What type it is (General / VIP)
- Original purchase price
- Whether it is listed for resale

The frontend calls `getTicketInfo(tokenId)` — a `view` function (costs no gas, just reads state):

```solidity
function getTicketInfo(uint256 tokenId) external view returns (
    TicketType ticketType,
    uint256 originalPrice,
    address owner,
    string memory uri
) {
    require(tokenId < _nextTokenId, "Ticket does not exist");
    return (ticketTypes[tokenId], originalTicketPrices[tokenId], ownerOf(tokenId), tokenURI(tokenId));
}
```

If the connected wallet is the ticket owner, the owner field is annotated with **(You)**.

---

## 16. Step 12 — Organizer Withdraws Revenue

All ETH from primary ticket sales accumulates inside the contract's balance. The organizer (deployer) can withdraw it at any time:

```solidity
function withdraw() external onlyOwner {
    uint256 balance = address(this).balance;
    payable(owner()).call{value: balance}("");
}
```

The `onlyOwner` modifier (from OpenZeppelin `Ownable`) ensures only the deployer's wallet can call this.

---

## 17. Data Flow Diagram

```
                        PRIMARY SALE
┌────────┐  click Buy    ┌────────────┐  purchaseTicket()   ┌─────────────────┐
│  User  │ ───────────► │  Frontend  │ ──────────────────► │  Smart Contract │
│        │              │  main.js   │   + 0.01 ETH        │  EventTicket    │
│        │ ◄─────────── │            │ ◄────────────────── │                 │
│        │  Token ID     └────────────┘  TicketPurchased    │  mints Token #N │
└────────┘                              event               │  to msg.sender  │
                                                            └─────────────────┘

                        RESALE
┌────────┐ listForResale  ┌─────────────────┐
│ Seller │ ─────────────► │  Smart Contract │
│        │                │                 │
│        │ ◄──────────── │  records listing │
└────────┘  confirmed      └────────┬────────┘
                                    │
┌────────┐ buyResaleTicket           │
│ Buyer  │ ─────────────────────────┘
│        │  + listed price
│        │
│        │ ◄─── NFT transferred
│ Seller │ ◄─── 90% proceeds
│Organiz.│ ◄─── 10% royalty
└────────┘

                        VERIFY
┌──────────┐ getTicketInfo(N)  ┌─────────────────┐
│ Verifier │ ────────────────► │  Smart Contract │
│ (Anyone) │ ◄──────────────── │                 │
└──────────┘  owner, type,     └─────────────────┘
              price, URI
```

---

## 18. Key Contracts, Files & Their Roles

| File | Role |
|------|------|
| `contracts/EventTicket.sol` | The smart contract — all business logic, state, and rules |
| `hardhat.config.js` | Configures Solidity version, EVM version, and network targets |
| `ignition/modules/EventTicket.js` | Deployment script — defines constructor args and deploys the contract |
| `ignition/deployments/` | Stores deployment receipts (contract address, block number, tx hash) |
| `scripts/mint.js` | Utility script to manually mint a ticket from the command line |
| `test/EventTicket.js` | Automated tests — covers deployment, purchasing, and resale with Chai assertions |
| `frontend/index.html` | The HTML shell — layout, tabs, modals |
| `frontend/main.js` | All frontend logic — wallet connection, contract calls, UI updates |
| `frontend/abi.js` | The contract ABI — generated by `hardhat compile`, used by ethers.js to encode/decode calls |

---

## 19. Glossary

| Term | Definition |
|------|-----------|
| **ABI** | Application Binary Interface — a JSON schema describing how to call a smart contract's functions |
| **Block** | A bundle of transactions permanently added to the blockchain |
| **bytecode** | Compiled machine code for the Ethereum Virtual Machine (EVM) |
| **ERC-721** | The Ethereum standard for Non-Fungible Tokens (NFTs) |
| **ETH / wei** | Ether is Ethereum's currency. 1 ETH = 1,000,000,000,000,000,000 wei (10^18) |
| **ethers.js** | JavaScript library for interacting with the Ethereum blockchain |
| **EVM** | Ethereum Virtual Machine — the sandboxed runtime that executes smart contract bytecode |
| **Gas** | A fee paid for every computation on Ethereum, denominated in ETH |
| **Hardhat** | A local Ethereum development environment and testing framework |
| **Ignition** | Hardhat's deployment system — manages contract deployments deterministically |
| **JSON-RPC** | The protocol the frontend uses to communicate with the Ethereum node over HTTP |
| **msg.sender** | The wallet address that called the current smart contract function |
| **msg.value** | The amount of ETH (in wei) sent with a transaction |
| **NFT** | Non-Fungible Token — a unique, ownable digital asset on the blockchain |
| **OpenZeppelin** | A library of secure, audited, reusable smart contract components |
| **Ownable** | OpenZeppelin contract that adds an `owner` address and `onlyOwner` access modifier |
| **Solidity** | The programming language used to write Ethereum smart contracts |
| **Token ID** | A unique integer identifier for a specific NFT within a contract |
| **Token URI** | A URL or data string pointing to a token's JSON metadata (name, image, attributes) |
| **Transaction** | A signed instruction sent to the blockchain to change state (e.g., mint, transfer) |
| **View function** | A contract function that only reads state — costs no gas when called off-chain |
| **Wallet** | A cryptographic key pair (public address + private key) used to sign transactions |
