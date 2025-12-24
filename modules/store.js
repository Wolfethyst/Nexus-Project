// src/modules/store.js
import { API, State, INFINITE_POINTS, STRIPE_PUBLISHABLE_KEY, apiGet, apiPost, showCustomConfirm, escapeHtml, formatCompact } from './config.js';

let stripe = null, stripeElements = null;
try { if (window.Stripe) stripe = Stripe(STRIPE_PUBLISHABLE_KEY); } catch (e) {}

let storeItems = [];
let nexusRedeems = [];
let ttsRedeemId = null, ttsRedeemCost = null;
let currentMarketTab = "store"; 
let marketSearchTerm = "";
let storeSortAsc = true;
let subTiersData = [];
let currentSubIndex = 0;
let selectedTipAmount = null;

// --- LEADERBOARD ---
export async function loadLeaderboard() {
  const { data } = await apiGet("/userdata");
  const map = {};
  for (const u of Object.values(data?.users || {})) { if (!u.uuid) continue; if (!map[u.uuid]) map[u.uuid] = { name: u.displayName, points: 0 }; map[u.uuid].points += (u.points || 0); }
  if (State.user && map[State.user.id]) { 
      State.points = map[State.user.id].points;
      const displayPoints = State.points >= INFINITE_POINTS ? "∞" : State.points.toLocaleString(); 
      document.getElementById("headerPoints").textContent = `${displayPoints} Crystals`; 
      document.getElementById("chatPointsText").textContent = formatCompact(State.points); 
  }
  let rows = Object.values(map).sort((a, b) => b.points - a.points).filter(u => u.name && !["wolfethyst","talathyst"].includes(u.name.toLowerCase()));
  const lbEl = document.getElementById("leaderboard");
  if (!lbEl) return;
  lbEl.innerHTML = rows.map((u, i) => { let rankClass = ""; if (i === 0) rankClass = "gold"; else if (i === 1) rankClass = "silver"; else if (i === 2) rankClass = "bronze"; return `<div class="lbRow ${rankClass}"><div class="lbPos">${i+1}</div><div class="lbName">${escapeHtml(u.name)}</div><div class="lbRight"><span>${formatCompact(u.points)}</span><img class="lbCrystal" src="https://data.wolfethyst.tv/assets/wolfe_crystal"></div></div>`; }).join("");
}

// --- STORE CORE ---
function injectDynamicStoreStyles(items) {
    let styleBlock = document.getElementById("dynamic-store-css");
    if (!styleBlock) {
        styleBlock = document.createElement("style"); styleBlock.id = "dynamic-store-css"; document.head.appendChild(styleBlock);
    }
    let allCss = "";
    items.forEach(item => { 
        if (item.customCss) {
            let css = item.customCss.trim();
            if (!css.includes("{")) { css = `.chatMsg.${item.cssClass} { ${css} }`; }
            allCss += `/* ${item.name} */\n${css}\n\n`; 
        }
    });
    styleBlock.textContent = allCss;
}

export async function loadStore() { await loadLeaderboard(); const { res, data } = await apiGet("/store/list"); if(res.ok) { storeItems = data.items || []; injectDynamicStoreStyles(storeItems); renderStore(); } }

export function switchMarketTab(tab) {
    currentMarketTab = tab;
    document.getElementById("tabStoreBtn").classList.toggle("active", tab === "store");
    document.getElementById("tabInvBtn").classList.toggle("active", tab === "inventory");
    renderStore();
}

export function toggleStoreSort() {
    storeSortAsc = !storeSortAsc;
    const btn = document.getElementById("storeSortBtn");
    if(btn) btn.innerHTML = storeSortAsc ? "Price ⬆" : "Price ⬇";
    renderStore();
}

export function renderStore() {
    const grid = document.getElementById("storeGrid");
    const legacyGrid = document.getElementById("storeGridLegacy");
    if(legacyGrid) legacyGrid.innerHTML = ""; 
    if (grid) { grid.style.display = "block"; grid.style.height = "100%"; grid.style.overflow = "hidden"; grid.className = ""; }

    storeItems.sort((a, b) => {
        let valA = a.cost === -1 ? 9999999 : a.cost;
        let valB = b.cost === -1 ? 9999999 : b.cost;
        return storeSortAsc ? valA - valB : valB - valA;
    });

    let itemsToShow = storeItems.filter(item => {
        const owned = State.inventory.includes(item.id);
        const nameMatch = item.name.toLowerCase().includes(marketSearchTerm);
        if (!nameMatch) return false;
        if (currentMarketTab === "store" && item.cost === -1) return false;
        if (currentMarketTab === "store") return !owned; 
        return owned; 
    });

    const avatarItems = itemsToShow.filter(i => !i.type || i.type === "avatar_decoration");
    const messageItems = itemsToShow.filter(i => i.type === "message_decoration");

    const css = `
        .store-split-container { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 100%; min-height: 0; }
        .store-column { display: flex; flex-direction: column; background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; height:100%; }
        .store-col-header { padding: 10px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; min-height: 40px; }
        .store-col-title { font-family: 'Cinzel', serif; color: var(--accent); font-size: 14px; }
        .store-col-list { overflow-y: auto; padding: 10px; flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; align-content: start; }
        @media (max-width: 768px) { .store-split-container { grid-template-columns: 1fr; } }
    `;
    let styleTag = document.getElementById('store-split-style');
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'store-split-style'; styleTag.innerHTML = css; document.head.appendChild(styleTag); }

    const generateList = (list, type) => {
        if (list.length === 0) {
            return `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#aaa; font-style:italic; font-size:12px;">${currentMarketTab === "store" ? "No items available." : "No items owned."}</div>`;
        }
        return list.map(item => {
            let equipped = false;
            if (State.user) {
                if (type === "avatar" && State.user.decoration === item.cssClass) equipped = true;
                if (type === "message" && State.user.activeMessageDecoration === item.cssClass) equipped = true;
            }
            let btn = "";
            if (currentMarketTab === "inventory") {
                 if (equipped) btn = `<button class="store-btn equipped">Equipped</button>`;
                 else btn = `<button class="store-btn owned" onclick="equipItem('${item.id}')">Equip</button>`;
            } else {
                 if (item.cost === -1) {
                    const label = item.subReq || "Subscribe";
                    btn = `<button class="store-btn locked" onclick="toggleSubModal(true)">${label}</button>`;
                } else {
                    btn = `<button class="store-btn" onclick="buyItem('${item.id}')">Buy ${item.cost}</button>`;
                }
            }
            let previewClass = `store-card-preview ${item.cssClass}`;
            let previewStyle = "";
            let previewContent = ""; 
            if(item.cssClass && item.cssClass.includes("/")) { previewStyle = `background-image: url('${item.cssClass}'); background-size: cover;`; previewClass = "store-card-preview"; }
            if (type === "avatar") { previewContent = `<img src="https://data.wolfethyst.tv/assets/nexus_icon" style="width:100%; height:100%; object-fit:cover; border-radius:inherit; pointer-events:none;">`; }
            if (type === "message") { previewClass += " chatMsg"; previewStyle += " border-radius: 4px; width: 100%; height: 40px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#ddd;"; previewContent = "Preview"; }
            return `<div class="store-card"><div class="${previewClass}" style="${previewStyle}">${previewContent}</div><div class="store-card-name">${escapeHtml(item.name)}</div><div class="store-card-cost" style="font-size:10px; opacity:0.7;">${item.cost === -1 ? "" : `${item.cost} Crystals`}</div>${btn}</div>`;
        }).join("");
    };

    const getUnequipBtn = (id) => {
         if (currentMarketTab === "inventory" && State.inventory.length > 0) {
             return `<button class="panelSmallBtn" style="font-size:10px; padding:4px 8px; height:auto; background:rgba(255,0,0,0.2); border-color:rgba(255,100,100,0.5);" onclick="equipItem('${id}')">Unequip</button>`;
         }
         return "";
    };

    grid.innerHTML = `<div class="store-split-container"><div class="store-column"><div class="store-col-header"><span class="store-col-title">Avatar Decorations</span>${getUnequipBtn('unequip_avatar')}</div><div class="store-col-list">${generateList(avatarItems, 'avatar')}</div></div><div class="store-column"><div class="store-col-header"><span class="store-col-title">Message Decorations</span>${getUnequipBtn('unequip_message')}</div><div class="store-col-list">${generateList(messageItems, 'message')}</div></div></div>`;
}

// Search Listener
const searchInput = document.getElementById("storeSearchInput");
if(searchInput) { searchInput.addEventListener("input", (e) => { marketSearchTerm = e.target.value.toLowerCase(); renderStore(); }); }

export async function buyItem(itemId) {
    showCustomConfirm("Confirm Purchase", "Are you sure you want to purchase this item?", async () => {
            const { res, data } = await apiPost("/store/purchase", { itemId });
            if(res.ok) {
                State.inventory = data.inventory;
                State.points = data.balance;
                renderStore();
                loadLeaderboard();
            } else { alert(data.error); }
        }
    );
}

export async function equipItem(itemId) {
    const { res, data } = await apiPost("/store/equip", { itemId });
    if (res.ok) {
        if (State.user) {
            if (data.type === "avatar_decoration") State.user.decoration = data.equipped; 
            if (data.type === "message_decoration") State.user.activeMessageDecoration = data.equipped; 
        }
        renderStore();
        const avatarBox = document.getElementById("avatarContainer");
        const img = avatarBox?.querySelector("img");
        if (img && data.type === "avatar_decoration") { img.className = `avatar ${data.equipped || ""}`; }
    } else { alert(data.error); }
}

// --- REDEEMS ---
function normalizeRedeemList(raw) { if (Array.isArray(raw.redeems)) return [{ label: null, redeems: raw.redeems }]; if (Array.isArray(raw.groups)) return raw.groups; return []; }
function renderRedeemDrawer(groups) {
  const redeemContentEl = document.getElementById("redeemContent");
  if (!redeemContentEl) return; 
  ttsRedeemId = null; nexusRedeems = [];
  const ttsCostLabelEl = document.getElementById("ttsCostLabel");
  const html = groups.map(group => {
    const list = Array.isArray(group.redeems) ? group.redeems : [];
    return list.map(r => {
      const id = String(r.id || r.key); const name = r.label || r.name; const cost = r.cost || r.price || 0; nexusRedeems.push({ ...r, __id: id });
      if (id.toLowerCase().includes("tts")) { ttsRedeemId = id; ttsRedeemCost = cost; return ""; }
      return `<div class="redeemCard"><div class="redeemMain"><div class="redeemName">${escapeHtml(name)}</div><div class="redeemDescription">${escapeHtml(r.description || "")}</div></div><div class="redeemMeta"><div class="redeemCost">${cost}<img src="https://data.wolfethyst.tv/assets/wolfe_crystal"></div><button class="panelSmallBtn redeemUseBtn" onclick="handleRedeemClick('${escapeHtml(id)}', this)">Use</button></div></div>`;
    }).join("");
  }).join("");
  redeemContentEl.innerHTML = html || "No redeems available."; 
  if (ttsCostLabelEl && ttsRedeemCost != null) { ttsCostLabelEl.textContent = `${ttsRedeemCost} `; }
}

export async function loadRedeems() { 
    const redeemContentEl = document.getElementById("redeemContent");
    if (!redeemContentEl) return; 
    try { const { res, data } = await apiGet("/nexus/redeems"); if (!res.ok) { redeemContentEl.innerHTML = "Unable to load redeems."; return; } const groups = normalizeRedeemList(data); renderRedeemDrawer(groups); } catch (err) { redeemContentEl.innerHTML = "Failed to load redeems."; } 
}

export async function handleRedeemClick(redeemId, buttonEl, explicitInput) {
  if (!State.user) { document.getElementById("loginPopup")?.classList.add("open"); return false; }
  const originalText = buttonEl ? buttonEl.textContent : ""; if (buttonEl) buttonEl.textContent = "Using...";
  try { const { res, data } = await apiPost("/nexus/redeems/redeem", { redeemId, input: explicitInput }); if (!res.ok) { alert(data?.error || "Failed."); if (buttonEl) buttonEl.textContent = originalText; return false; } else { if (buttonEl) { buttonEl.textContent = "Used!"; setTimeout(() => buttonEl.textContent = originalText, 1500); } loadLeaderboard(); return true; } } catch (e) { alert("Error."); if (buttonEl) buttonEl.textContent = originalText; return false; }
}

// Redeem UI Listeners
const ttsRedeemFormEl = document.getElementById("ttsRedeemForm");
const ttsRedeemInputEl = document.getElementById("ttsRedeemInput");
const ttsRedeemButton = document.getElementById("ttsRedeemButton");
if (ttsRedeemFormEl) { ttsRedeemFormEl.addEventListener("submit", async (ev) => { ev.preventDefault(); if (!ttsRedeemId) return; const text = ttsRedeemInputEl.value.trim(); if (text) { if(ttsRedeemButton) ttsRedeemButton.innerText = "Sending..."; const success = await handleRedeemClick(ttsRedeemId, null, text); if (success) { ttsRedeemInputEl.value = ""; if(ttsRedeemButton) { ttsRedeemButton.innerText = "Sent!"; ttsRedeemButton.style.backgroundColor = "#4ff"; ttsRedeemButton.style.color = "#000"; setTimeout(() => { ttsRedeemButton.innerText = "Send"; ttsRedeemButton.style.backgroundColor = ""; ttsRedeemButton.style.color = ""; }, 2000); } } else { if(ttsRedeemButton) ttsRedeemButton.innerText = "Send"; } } }); }
const redeemChip = document.getElementById("redeemChip"); const redeemDrawer = document.getElementById("redeemDrawer");
if (redeemChip && redeemDrawer) { redeemChip.addEventListener("click", (e) => { e.stopPropagation(); redeemDrawer.classList.toggle("open"); }); document.addEventListener("click", (e) => { if (redeemDrawer.classList.contains("open")) { if (!redeemDrawer.contains(e.target) && !redeemChip.contains(e.target)) { redeemDrawer.classList.remove("open"); } } }); }

// --- TIPS ---
export function toggleTipModal(show) {
    const el = document.getElementById('tipOverlay');
    if (!el) return;
    if (show) { toggleSubModal(false); el.classList.remove('hidden'); setTimeout(() => el.classList.add('open'), 10); } 
    else { el.classList.remove('open'); setTimeout(() => el.classList.add('hidden'), 300); }
}

export function selectTipAmount(amount) {
    document.querySelectorAll('.tip-preset').forEach(btn => {
        btn.classList.remove('active');
        if(parseInt(btn.innerText.replace('$','')) === amount) btn.classList.add('active');
    });
    const customInput = document.getElementById('tipCustomInput');
    if(customInput) customInput.value = "";
    updateTipState(amount);
}

function updateTipState(amount) {
    selectedTipAmount = amount;
    const label = document.getElementById("tipSelectedAmountValue");
    if(label) label.innerText = `$${amount}`;
    const checkoutBtn = document.getElementById('tipCheckoutBtn');
    if(amount > 0) { loadStripePaymentElement(amount); } else { const el = document.getElementById("tipCardElement"); if(el) el.innerHTML = ""; if(checkoutBtn) checkoutBtn.style.display = "none"; }
}

const tipCustomInput = document.getElementById('tipCustomInput');
if(tipCustomInput) {
    let debounceTimer;
    tipCustomInput.addEventListener("input", () => {
        document.querySelectorAll('.tip-preset').forEach(b => b.classList.remove('active'));
        const val = parseInt(tipCustomInput.value) || 0;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { updateTipState(val); }, 800);
    });
}

const tipCheckoutBtn = document.getElementById('tipCheckoutBtn');
async function loadStripePaymentElement(amount) {
    if (!amount || amount <= 0) return;
    const container = document.getElementById('tipCardElement');
    if(container) container.innerHTML = ""; 
    const { res, data } = await apiPost("/stripe/tip-intent", { amountCents: amount * 100 });
    if (!res.ok) { alert("Could not initialize payment system."); return; }
    const clientSecret = data.clientSecret;
    const appearance = { theme: 'night', labels: 'floating', variables: { colorPrimary: '#d57bff' } };
    stripeElements = stripe.elements({ clientSecret, appearance });
    const paymentElement = stripeElements.create('payment', { layout: 'tabs' });
    paymentElement.mount("#tipCardElement");
    if(tipCheckoutBtn) tipCheckoutBtn.style.display = "block";
}

if (tipCheckoutBtn) {
    tipCheckoutBtn.addEventListener("click", async () => {
        if (!stripe || !stripeElements) return;
        tipCheckoutBtn.innerText = "Processing..."; tipCheckoutBtn.disabled = true;
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({ elements: stripeElements, confirmParams: { return_url: window.location.href + "?payment_success=true", }, redirect: "if_required" });
            if (error) { alert(error.message); } 
            else if (paymentIntent && paymentIntent.status === "succeeded") {
                await apiPost("/support/tip/confirm", { paymentIntentId: paymentIntent.id, message: "" });
                alert(`Tip sent! Thank you!`);
                if(tipCustomInput) tipCustomInput.value = ""; 
                selectTipAmount(0); 
                toggleTipModal(false);
            }
        } catch (e) { alert("Payment failed: " + e.message); } finally { tipCheckoutBtn.innerText = "Send Tip"; tipCheckoutBtn.disabled = false; }
    });
}

// --- SUBSCRIPTIONS ---
export async function loadSubscriptionTiers() {
    try { const { res, data } = await apiGet("/support/tiers/config"); if (res.ok && data.tiers) { subTiersData = data.tiers; if (subTiersData.length > 0) { const modal = document.getElementById('subCarouselOverlay'); if (modal && !modal.classList.contains('hidden')) { renderSubCarousel(currentSubIndex); } } } } catch (e) { }
}

export function renderSubCarousel(index) {
    if (!subTiersData.length) return;
    if (index < 0) index = subTiersData.length - 1;
    if (index >= subTiersData.length) index = 0;
    currentSubIndex = index;
    const tier = subTiersData[index];
    const iconUrl = tier.badgeUrl || tier.icon || "https://data.wolfethyst.tv/assets/nexus_icon";
    const iconContainer = document.getElementById('carouselIcon');
    if(iconContainer) iconContainer.innerHTML = `<img src="${iconUrl}">`;
    const titleEl = document.getElementById('carouselTitle');
    if(titleEl) { titleEl.innerText = tier.name; titleEl.style.color = tier.color; titleEl.style.textShadow = `0 0 10px ${tier.color}60`; }
    const priceEl = document.getElementById('carouselPrice');
    if(priceEl) priceEl.innerText = tier.priceLabel;
    const benefitsList = document.getElementById('carouselBenefits');
    if(benefitsList) benefitsList.innerHTML = (tier.benefits || []).map(b => `<li>${escapeHtml(b)}</li>`).join('');
    const previewEl = document.getElementById('carouselMsgPreview');
    const previewName = document.getElementById('previewUser');
    if (previewEl && previewName) {
        previewEl.className = "chatMsg";
        const avatarImg = previewEl.querySelector('.chatAvatarImg');
        if (avatarImg) avatarImg.className = "chatAvatarImg";
        const lowerName = tier.name.toLowerCase();
        if (lowerName.includes("novice")) { previewEl.classList.add("border_t1"); if (avatarImg) avatarImg.classList.add("avatar-novice"); } 
        else if (lowerName.includes("magus")) { previewEl.classList.add("border_t2"); if (avatarImg) avatarImg.classList.add("avatar-magus"); } 
        else if (lowerName.includes("archon")) { previewEl.classList.add("border_t3"); if (avatarImg) avatarImg.classList.add("avatar-archon"); }
        previewName.style.color = tier.color;
    }
    const btn = document.getElementById('carouselSubBtn');
    if(btn) { btn.onclick = () => initiateSub(tier); btn.style.background = tier.color; btn.style.boxShadow = `0 0 15px ${tier.color}40`; }
    const dotsContainer = document.getElementById('carouselDots');
    if(dotsContainer) { dotsContainer.innerHTML = subTiersData.map((_, i) => `<div class="dot ${i === index ? 'active' : ''}" onclick="window.renderSubCarousel(${i})"></div>`).join(''); }
}

function initiateSub(tier) {
    showCustomConfirm("Subscribe?", `Subscribe to ${tier.name}? You will be redirected to Stripe.`, async () => {
         try { const { res, data } = await apiPost("/support/subscribe", { tier: tier.id }); if(res.ok && data.url) { window.location.href = data.url; } else { alert("Error: " + (data.error || "Could not initialize Stripe")); } } catch(e) { alert("Connection failed."); }
    });
}

export function toggleSubModal(show) {
    const el = document.getElementById('subCarouselOverlay');
    if (!el) return;
    if (show) { toggleTipModal(false); el.classList.remove('hidden'); setTimeout(() => el.classList.add('open'), 10); if (subTiersData.length > 0) renderSubCarousel(currentSubIndex); else loadSubscriptionTiers(); } 
    else { el.classList.remove('open'); setTimeout(() => el.classList.add('hidden'), 300); }
}

document.getElementById('subNextBtn')?.addEventListener('click', () => { renderSubCarousel(currentSubIndex + 1); });
document.getElementById('subPrevBtn')?.addEventListener('click', () => { renderSubCarousel(currentSubIndex - 1); });

export async function setupDigitalWallets() {
    if (!stripe) return;
    let paymentRequest = stripe.paymentRequest({ country: 'US', currency: 'usd', total: { label: 'Tip for Wolfethyst', amount: 0, pending: true }, requestPayerName: true, requestPayerEmail: true });
    const result = await paymentRequest.canMakePayment();
    if (result) {
        stripeElements = stripeElements || stripe.elements({ appearance: { theme: 'night' } });
        let prButton = stripeElements.create('paymentRequestButton', { paymentRequest: paymentRequest, style: { paymentRequestButton: { theme: 'dark', height: '40px' } } });
        const container = document.getElementById('payment-request-button');
        if(container) prButton.mount('#payment-request-button');
    }
}