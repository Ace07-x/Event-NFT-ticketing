import { ethers } from 'ethers';
import { EventTicketABI } from './abi.js';

// ─── Contract Config ──────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const GENERAL_PRICE = ethers.parseEther("0.01");
const VIP_PRICE    = ethers.parseEther("0.05");
const GENERAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" style="background:linear-gradient(135deg, #1e293b, #0f172a); font-family:sans-serif;"><rect width="100%" height="100%" fill="transparent"/><circle cx="150" cy="120" r="60" fill="#6366f1" opacity="0.8"/><text x="50%" y="55%" font-size="28" text-anchor="middle" fill="#818cf8" font-weight="800" letter-spacing="1">GENERAL</text><text x="50%" y="65%" font-size="20" text-anchor="middle" fill="#94a3b8" font-weight="600">ADMISSION</text><text x="50%" y="85%" font-size="14" text-anchor="middle" fill="#475569">TicketX On-Chain Pass</text></svg>`;
const VIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" style="background:linear-gradient(135deg, #422006, #1e1b4b); font-family:sans-serif;"><rect width="100%" height="100%" fill="transparent"/><polygon points="150,50 180,130 260,130 195,180 220,260 150,210 80,260 105,180 40,130 120,130" fill="#facc15" opacity="0.9"/><text x="50%" y="75%" font-size="32" text-anchor="middle" fill="#facc15" font-weight="800" letter-spacing="2">VIP PASS</text><text x="50%" y="85%" font-size="14" text-anchor="middle" fill="#a16207">Premium All-Access</text></svg>`;

const GENERAL_URI  = "data:application/json;base64," + btoa(JSON.stringify({ name: "General Admission", description: "Standard TicketX Pass", image: "data:image/svg+xml;base64," + btoa(GENERAL_SVG) }));
const VIP_URI      = "data:application/json;base64," + btoa(JSON.stringify({ name: "VIP Pass", description: "Premium TicketX Pass", image: "data:image/svg+xml;base64," + btoa(VIP_SVG) }));

// ─── DOM — Navbar / Status ────────────────────────────────────────────────────
const connectBtn  = document.getElementById('connectBtn');
const statusPill  = document.getElementById('statusPill');
const statusText  = document.getElementById('statusText');
const statusDot   = statusPill.querySelector('.dot');
const walletInfo  = document.getElementById('walletInfo');
const walletAddr  = document.getElementById('walletAddress');
const networkName = document.getElementById('networkName');
const dappSection = document.getElementById('dappSection');
const faucetBtn   = document.getElementById('faucetBtn');

// ─── DOM — Mint ───────────────────────────────────────────────────────────────
const mintGeneralBtn    = document.getElementById('mintGeneralBtn');
const mintStatusGeneral = document.getElementById('mintStatusGeneral');
const mintVipBtn        = document.getElementById('mintVipBtn');
const mintStatusVip     = document.getElementById('mintStatusVip');
const mintWalletBalance = document.getElementById('mintWalletBalance');

// ─── DOM — Confirm Modal ──────────────────────────────────────────────────────
const mintConfirmOverlay  = document.getElementById('mintConfirmOverlay');
const confirmModalType    = document.getElementById('confirmModalType');
const confirmModalCost    = document.getElementById('confirmModalCost');
const confirmModalBalance = document.getElementById('confirmModalBalance');
const confirmModalCancel  = document.getElementById('confirmModalCancel');
const confirmModalProceed = document.getElementById('confirmModalProceed');

// ─── DOM — My Tickets ─────────────────────────────────────────────────────────
const refreshTicketsBtn = document.getElementById('refreshTicketsBtn');
const ticketsLoading    = document.getElementById('ticketsLoading');
const ticketsEmpty      = document.getElementById('ticketsEmpty');
const ticketsList       = document.getElementById('ticketsList');

// ─── DOM — Verify ─────────────────────────────────────────────────────────────
const verifyInput  = document.getElementById('verifyInput');
const verifyBtn    = document.getElementById('verifyBtn');
const verifyError  = document.getElementById('verifyError');
const verifyResult = document.getElementById('verifyResult');

// ─── DOM — Network Stats ──────────────────────────────────────────────────────
const refreshStatsBtn  = document.getElementById('refreshStatsBtn');
const statsBlockNumber = document.getElementById('statsBlockNumber');

// ─── State ────────────────────────────────────────────────────────────────────
let provider = null;
let readProvider = null;
let signer = null;
let currentAccount = null;
let eventTicketContract = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  setupTabs();
  setupCopyButtons();

  readProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  provider = readProvider;

  // Auto-connect with the local wallet instantly so there's no manual wallet linking
  await connectWallet();
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${tab}`).classList.add('active');
      if (tab === 'my-tickets') loadMyTickets();
      if (tab === 'stats') loadNetworkStats();
    });
  });
}

// ─── COPY TO CLIPBOARD ────────────────────────────────────────────────────────
function setupCopyButtons() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const targetId = btn.dataset.copyTarget;
    const el = document.getElementById(targetId);
    // Strip trailing annotation like " (You)"
    const text = el?.innerText?.replace(/\s*\(You\)\s*$/, '').trim();
    if (!text || text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });
}

// ─── WALLET ───────────────────────────────────────────────────────────────────
async function connectWallet() {
  try {
    connectBtn.innerText = "Connecting…";
    
    // Use Hardhat default account #0 private key
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    signer = new ethers.Wallet(privateKey, readProvider);
    
    await handleAccountsChanged([signer.address]);
  } catch (err) {
    console.error("Connection failed:", err);
    connectBtn.innerText = "Connect Wallet";
  }
}


async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    currentAccount = null;
    updateUIForDisconnected();
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
    
    // We already have `signer` setup from connectWallet.
    eventTicketContract = new ethers.Contract(CONTRACT_ADDRESS, EventTicketABI, signer);
    
    const network = await readProvider.getNetwork();
    updateUIForConnected(currentAccount, network);
  }
}

// ─── MINTING ──────────────────────────────────────────────────────────────────
async function mintTicket(type, uri, price, btnEl, statusEl) {
  if (!eventTicketContract) return;
  try {
    statusEl.innerText = "Initiating transaction…";
    statusEl.className = "mint-status";
    btnEl.disabled = true;

    const tx = await eventTicketContract.purchaseTicket(type, uri, { value: price });
    statusEl.innerText = "Waiting for confirmation…";
    const receipt = await tx.wait();

    let mintedTokenId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = eventTicketContract.interface.parseLog(log);
        if (parsed && parsed.name === 'TicketPurchased') {
          mintedTokenId = parsed.args.tokenId.toString();
          break;
        }
      } catch (e) {}
    }

    let extraHtml = '';
    if (mintedTokenId) {
      const tidId = `minted-tid-${mintedTokenId}-${type}`;
      const contractId = `minted-contract-${mintedTokenId}-${type}`;
      
      // Inline styling to present the newly minted ticket details neatly
      extraHtml = `
        <div style="margin-top:0.75rem; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); padding:0.75rem; border-radius:8px; font-size:0.85rem; text-align:left;">
          <div class="field-value-row" style="margin-bottom:0.4rem; justify-content: space-between;">
            <span class="field-label">Token ID</span>
            <div class="field-value-row">
              <span class="field-value mono" id="${tidId}">${mintedTokenId}</span>
              <button class="copy-btn" data-copy-target="${tidId}" style="padding:0.2rem 0.3rem">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div class="field-value-row" style="margin-bottom:0.6rem; justify-content: space-between;">
            <span class="field-label">Contract</span>
            <div class="field-value-row">
              <span class="field-value mono truncate-addr" id="${contractId}" style="max-width:120px;">${CONTRACT_ADDRESS}</span>
              <button class="copy-btn" data-copy-target="${contractId}" style="padding:0.2rem 0.3rem">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div style="margin-top: 0.5rem;">
            <button onclick="document.getElementById('tab-verify-btn').click(); document.getElementById('verifyInput').value='${mintedTokenId}'; document.getElementById('verifyBtn').click();" class="btn outline-btn full-width" style="padding:0.4rem; font-size:0.8rem; border-color:var(--accent-color); color:var(--text-primary);">
              View & Verify
            </button>
          </div>
        </div>
      `;
    }

    statusEl.innerHTML = `✓ Minted! Tx: <a href="https://sepolia.etherscan.io/tx/${receipt.hash}" target="_blank" style="color:var(--accent-color);">${receipt.hash.substring(0, 10)}…</a> ${extraHtml}`;
    statusEl.className = "mint-status success";
    btnEl.innerText = "Mint Another";
    btnEl.disabled = false;
  } catch (err) {
    console.error(err);
    let msg = err.reason || err.message || 'Unknown error';
    // Friendly message for the most common local dev error
    if (msg.includes('missing revert data') || msg.includes('estimateGas') || msg.includes('data=null')) {
      msg = 'Transaction failed — make sure your local node is running and you have enough TIX balance.';
    } else if (msg.includes('Incorrect ticket price')) {
      msg = 'Incorrect amount sent. Try clicking +100 TIX first to fund your wallet.';
    } else {
      msg = msg.substring(0, 80);
    }
    statusEl.innerText = `Error: ${msg}`;
    statusEl.className = "mint-status error";
    btnEl.disabled = false;
  }
}


// ─── MY TICKETS ───────────────────────────────────────────────────────────────
async function loadMyTickets() {
  if (!eventTicketContract || !currentAccount) return;

  ticketsList.innerHTML = '';
  ticketsEmpty.classList.add('hidden');
  ticketsLoading.classList.remove('hidden');

  try {
    const tokenIds = await eventTicketContract.getTicketsByOwner(currentAccount);
    ticketsLoading.classList.add('hidden');

    if (tokenIds.length === 0) {
      ticketsEmpty.classList.remove('hidden');
      return;
    }

    for (const tokenId of tokenIds) {
      const info    = await eventTicketContract.getTicketInfo(tokenId);
      const listing = await eventTicketContract.resaleListings(tokenId);
      
      let imageUrl = '';
      try {
        if (info.uri.startsWith('data:application/json')) {
          const jsonStr = atob(info.uri.split(',')[1]);
          const metadata = JSON.parse(jsonStr);
          imageUrl = metadata.image || '';
        }
      } catch(e) { console.error("Failed to parse URI for token", tokenId); }

      ticketsList.appendChild(buildTicketCard(tokenId, info, listing, imageUrl));
    }
  } catch (err) {
    ticketsLoading.classList.add('hidden');
    ticketsList.innerHTML = `<p class="error-msg">Failed to load tickets: ${err.message.substring(0, 100)}</p>`;
    console.error(err);
  }
}

function buildTicketCard(tokenId, info, listing, imageUrl) {
  const isVip        = Number(info.ticketType) === 1;
  const price        = ethers.formatEther(info.originalPrice);
  const isListed     = listing.isListed;
  const listingPrice = isListed ? ethers.formatEther(listing.price) : null;
  const tid          = tokenId.toString();
  const contractId   = `tc-contract-${tid}`;
  const tokenIdId    = `tc-tokenid-${tid}`;

  const imageHtml = imageUrl ? `<div style="text-align:center; margin-bottom:1.25rem;"><img src="${imageUrl}" alt="Ticket Image" style="max-width:100%; max-height:220px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 12px rgba(0,0,0,0.2);" /></div>` : '';

  const card = document.createElement('div');
  card.className = `ticket-card glass-card${isVip ? ' vip-card' : ''}`;
  card.innerHTML = `
    <div class="ticket-card-header">
      <span class="ticket-type-badge ${isVip ? 'badge-vip' : 'badge-general'}">${isVip ? '★ VIP Pass' : 'General Admission'}</span>
      ${isListed ? '<span class="resale-badge">Listed for Resale</span>' : ''}
    </div>

    ${imageHtml}

    <div class="ticket-card-body">
      <div class="ticket-field">
        <span class="field-label">Token ID</span>
        <div class="field-value-row">
          <span class="field-value mono" id="${tokenIdId}">#${tid}</span>
          <button class="copy-btn" data-copy-target="${tokenIdId}" title="Copy Token ID">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>

      <div class="ticket-field">
        <span class="field-label">Contract Address</span>
        <div class="field-value-row">
          <span class="field-value mono truncate-addr" id="${contractId}">${CONTRACT_ADDRESS}</span>
          <button class="copy-btn" data-copy-target="${contractId}" title="Copy Contract Address">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>

      <div class="ticket-field">
        <span class="field-label">Original Price</span>
        <span class="field-value">${price} TIX</span>
      </div>

      ${isListed ? `
      <div class="ticket-field">
        <span class="field-label">Resale Price</span>
        <span class="field-value" style="color:var(--accent-color)">${listingPrice} TIX</span>
      </div>` : ''}
    </div>
  `;
  return card;
}

// ─── VERIFY TICKET ────────────────────────────────────────────────────────────
async function verifyTicket() {
  const raw = verifyInput.value.trim();
  if (raw === '') { showVerifyError('Please enter a Token ID.'); return; }

  const tokenId = parseInt(raw, 10);
  if (isNaN(tokenId) || tokenId < 0) {
    showVerifyError('Please enter a valid non-negative integer Token ID.');
    return;
  }

  verifyError.classList.add('hidden');
  verifyResult.classList.add('hidden');
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `<svg class="spin-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Verifying…`;

  try {
    const info    = await eventTicketContract.getTicketInfo(tokenId);
    const listing = await eventTicketContract.resaleListings(tokenId);

    const isVip       = Number(info.ticketType) === 1;
    const price       = ethers.formatEther(info.originalPrice);
    const isListed    = listing.isListed;
    const resaleText  = isListed
      ? `Listed at ${ethers.formatEther(listing.price)} TIX`
      : 'Not listed for resale';

    // Parse image
    let imageUrl = '';
    try {
      if (info.uri.startsWith('data:application/json')) {
        const jsonStr = atob(info.uri.split(',')[1]);
        const metadata = JSON.parse(jsonStr);
        imageUrl = metadata.image || '';
      }
    } catch(e) {}

    // Populate image
    const imgContainer = document.getElementById('resultImageContainer');
    const imgEl = document.getElementById('resultImage');
    if (imageUrl) {
      imgEl.src = imageUrl;
      imgContainer.style.display = 'block';
    } else {
      imgContainer.style.display = 'none';
      imgEl.src = '';
    }

    // Populate fields
    document.getElementById('resultTokenId').innerText     = `#${tokenId}`;
    document.getElementById('resultContractAddr').innerText = CONTRACT_ADDRESS;
    document.getElementById('resultPrice').innerText        = `${price} TIX`;
    document.getElementById('resultResale').innerText       = resaleText;

    // Owner field — annotate if it belongs to the connected wallet
    const ownerEl = document.getElementById('resultOwner');
    const isOwner = info.owner.toLowerCase() === currentAccount?.toLowerCase();
    ownerEl.innerText = isOwner ? `${info.owner} (You)` : info.owner;
    ownerEl.classList.toggle('owner-you', isOwner);

    // Badge
    const badge = document.getElementById('resultTicketBadge');
    badge.innerText   = isVip ? '★ VIP Pass' : 'General Admission';
    badge.className   = `ticket-type-badge ${isVip ? 'badge-vip' : 'badge-general'}`;

    verifyResult.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    const msg = err.reason || err.message || '';
    if (msg.includes('does not exist') || msg.includes('nonexistent')) {
      showVerifyError(`Ticket #${tokenId} does not exist on this contract.`);
    } else {
      showVerifyError(`Verification failed: ${msg.substring(0, 100)}`);
    }
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Verify`;
  }
}

function showVerifyError(msg) {
  verifyError.innerText = msg;
  verifyError.classList.remove('hidden');
  verifyResult.classList.add('hidden');
}

// ─── NETWORK STATS ────────────────────────────────────────────────────────────
async function loadNetworkStats() {
  if (!readProvider) return;
  statsBlockNumber.innerText = 'Loading...';
  try {
    const blockNum = await readProvider.getBlockNumber();
    statsBlockNumber.innerText = blockNum.toString();
  } catch (err) {
    console.error("Failed to load block number", err);
    statsBlockNumber.innerText = "Error";
  }
}

// ─── UI STATE ─────────────────────────────────────────────────────────────────
function updateUIForConnected(account, network) {
  const short = `${account.substring(0, 6)}…${account.substring(account.length - 4)}`;
  connectBtn.innerText = short;
  connectBtn.classList.remove('primary-btn');
  connectBtn.style.backgroundColor = "rgba(255,255,255,0.1)";

  statusText.innerText = "Connected";
  statusDot.classList.replace('disconnected', 'connected');

  walletInfo.classList.remove('hidden');
  dappSection.classList.remove('hidden');

  walletAddr.innerText    = account;
  networkName.innerText   = network.name !== "unknown" ? network.name : `Chain ID: ${network.chainId}`;

  // Fetch and display wallet balance
  updateWalletBalance();
}

function updateUIForDisconnected() {
  connectBtn.innerText = "Connect Wallet";
  connectBtn.classList.add('primary-btn');
  connectBtn.style.backgroundColor = "";

  statusText.innerText = "Disconnected";
  statusDot.classList.replace('connected', 'disconnected');

  walletInfo.classList.add('hidden');
  dappSection.classList.add('hidden');
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
connectBtn.addEventListener('click', () => { if (!currentAccount) connectWallet(); });

// ─── WALLET BALANCE ───────────────────────────────────────────────────────────
async function updateWalletBalance() {
  if (!currentAccount) return;
  try {
    const raw = await readProvider.getBalance(currentAccount);
    const eth = parseFloat(ethers.formatEther(raw)).toFixed(4);
    mintWalletBalance.innerText = `${eth} TIX`;
    mintWalletBalance.style.color = parseFloat(eth) < 0.01 ? '#f87171' : 'var(--text-primary)';
    return raw;
  } catch(e) { return null; }
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
let _pendingMintArgs = null;

async function showMintConfirm(type, uri, price, btnEl, statusEl) {
  if (!eventTicketContract) return;

  const balance = await updateWalletBalance();
  const label = type === 0 ? 'General Admission' : '★ VIP Pass';
  const costEth = ethers.formatEther(price);

  if (balance !== null && balance < price) {
    statusEl.innerText = `Insufficient balance. You need ${costEth} TIX but have ${parseFloat(ethers.formatEther(balance)).toFixed(4)} TIX.`;
    statusEl.className = 'mint-status error';
    return;
  }

  // Populate modal
  confirmModalType.innerText    = label;
  confirmModalCost.innerText    = `${costEth} TIX`;
  confirmModalBalance.innerText = balance !== null
    ? `${parseFloat(ethers.formatEther(balance)).toFixed(4)} TIX`
    : '— TIX';

  _pendingMintArgs = { type, uri, price, btnEl, statusEl };
  mintConfirmOverlay.style.display = 'flex';
}

confirmModalCancel.addEventListener('click', () => {
  mintConfirmOverlay.style.display = 'none';
  _pendingMintArgs = null;
});

mintConfirmOverlay.addEventListener('click', (e) => {
  if (e.target === mintConfirmOverlay) {
    mintConfirmOverlay.style.display = 'none';
    _pendingMintArgs = null;
  }
});

confirmModalProceed.addEventListener('click', async () => {
  if (!_pendingMintArgs) return;
  mintConfirmOverlay.style.display = 'none';
  const { type, uri, price, btnEl, statusEl } = _pendingMintArgs;
  _pendingMintArgs = null;
  await mintTicket(type, uri, price, btnEl, statusEl);
  updateWalletBalance(); // refresh after mint
});

mintGeneralBtn.addEventListener('click', () =>
  showMintConfirm(0, GENERAL_URI, GENERAL_PRICE, mintGeneralBtn, mintStatusGeneral));

mintVipBtn.addEventListener('click', () =>
  showMintConfirm(1, VIP_URI, VIP_PRICE, mintVipBtn, mintStatusVip));

refreshTicketsBtn.addEventListener('click', loadMyTickets);

verifyBtn.addEventListener('click', verifyTicket);
verifyInput.addEventListener('keydown', e => { if (e.key === 'Enter') verifyTicket(); });

refreshStatsBtn.addEventListener('click', loadNetworkStats);

faucetBtn.addEventListener('click', async () => {
  if (!currentAccount) return;
  try {
    faucetBtn.innerText = "Funding...";
    faucetBtn.disabled = true;

    // Use raw fetch to call the hardhat node directly — bypasses MetaMask
    const newBalance = ethers.toBeHex(ethers.parseEther("1000"));
    const response = await fetch("http://127.0.0.1:8545", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "hardhat_setBalance",
        params: [currentAccount, newBalance]
      })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    faucetBtn.innerText = "✓ Funded!";
    // Force balance refresh after a short delay
    setTimeout(async () => {
      await updateWalletBalance();
      faucetBtn.innerText = "+100 TIX";
      faucetBtn.disabled = false;
    }, 1000);
  } catch (err) {
    console.error("Faucet error:", err);
    faucetBtn.innerText = "Failed";
    setTimeout(() => {
      faucetBtn.innerText = "+100 TIX";
      faucetBtn.disabled = false;
    }, 2000);
  }
});



// ─── RUN ──────────────────────────────────────────────────────────────────────
init();
