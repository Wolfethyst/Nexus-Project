// src/modules/video.js
import { apiGet, apiPost, escapeHtml, PLACEHOLDER_IMG, CLOUDFLARE_CUSTOMER, State } from './config.js';
import { openVodEditModal } from './admin.js';
import { addSystemMessage } from './chat.js'; 

let allPlayedGames = [];
let vodsData = []; 
let activeGameVods = []; 
let clipsData = [];
let activeVideoItem = null;
let activeVideoType = null;
let currentGameName = null;

const mainVideoPlayer = document.getElementById('main-video-player');

// --- HELPERS ---
function getThumbUrl(item, type) {
    if (item.vod_provider === 'youtube') return `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg`;
    if (item.vod_provider === 'odysee') return `https://thumbnails.lbry.com/${item.id}`; 
    
    // Cloudflare Fallback
    const vidId = item.videoId || item.cloudflare_id; 
    if(vidId) return `https://customer-${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${vidId}/thumbnails/thumbnail.jpg`;
    
    return PLACEHOLDER_IMG;
}

// [UPDATED] Prioritized Loading Sequence
export async function loadVideoData() {
    const params = new URLSearchParams(window.location.search);
    const directClipId = params.get("clip");
    const directVodId = params.get("vod");

    if (directClipId) {
        try {
            const { data } = await apiGet(`/clips/meta?id=${directClipId}`);
            if (data && data.ok && data.clip) {
                playVideo(data.clip, 'clip'); 
            }
        } catch(e) { console.error("Fast load failed", e); }
    } 

    const heavyLifting = Promise.all([
        loadGames().then(() => {
            if (currentGameName) updatePlayedGamesList(currentGameName);
            else renderHubGames();
        }),
        loadStreamTitle(),
        loadClips(),
        loadVods().then(() => {
            if (directVodId && vodsData.length > 0) {
                handleVideoClick(directVodId, 'vod');
            }
        })
    ]);

    await heavyLifting;

    const loader = document.getElementById("appLoader");
    if(loader) {
        setTimeout(() => loader.classList.add("hidden"), 500); 
    }
}

async function loadGames() {
    const { data } = await apiGet("/played");
    allPlayedGames = (data?.games || []).map((g, i) => ({ ...g, __index: i }));
    if (currentGameName) updatePlayedGamesList(currentGameName);
    else renderHubGames(); 
}

async function loadClips() {
    try { const { data } = await apiGet('/clips/list'); if(data?.ok) clipsData = data.clips; } catch(e){}
}

async function loadVods() {
    try {
      const { data } = await apiGet('/streams/list?limit=50');
      if(data && data.streams) {
        vodsData = data.streams;
        let unsortedCount = 0;
        vodsData.forEach(v => {
            if (!v.game_name && v.title) {
                if (v.title.includes(" - ")) {
                    const parts = v.title.split(" - ");
                    v.game_name = parts[parts.length - 1].trim();
                } else if (v.title.includes(" | ")) {
                    const parts = v.title.split(" | ");
                    v.game_name = parts[parts.length - 1].trim();
                }
            }
            if (!v.game_name) unsortedCount++;
        });

        if (State.isModOrOwner && unsortedCount > 0) {
            allPlayedGames = allPlayedGames.filter(g => g.name !== "⚠️ Inbox");
            allPlayedGames.push({ name: "⚠️ Inbox", cover: "https://data.wolfethyst.tv/assets/nexus_icon", isVirtual: true, isInbox: true });
        }
        allPlayedGames.sort((a,b) => (a.isInbox ? -1 : a.name.localeCompare(b.name)));
        renderHubGames(); 
      }
    } catch(e) { console.error("VODs load error", e); }
}

export async function loadStreamTitle() {
    const { data } = await apiGet("/stream/now");
    
    const titleInput = document.getElementById("streamTitleInput");
    const gameInput = document.getElementById("streamGameInput");
    const titleLabel = document.getElementById("streamTitleLabel"); 
    const gameLabel = document.getElementById("streamGameLabel"); 
    const statusText = document.getElementById("liveStatusCardText");

    if (data) {
        if(titleInput) titleInput.value = data.title || "";
        if(gameInput) gameInput.value = data.game || "";
        if(titleLabel) titleLabel.textContent = data.title || "Stream Title";
        if(gameLabel) gameLabel.textContent = data.game || "Just Chatting"; 

        if (data.live) {
            if(statusText) {
                statusText.textContent = "● Live";
                statusText.style.color = "#72ffb0"; 
                statusText.style.textShadow = "0 0 8px rgba(114, 255, 176, 0.5)";
            }
        } else {
             if(statusText) {
                statusText.textContent = "● Offline";
                statusText.style.color = "var(--text-muted)";
                statusText.style.textShadow = "none";
            }
        }

        if (data.game) updatePlayedGamesList(data.game);
    }
}

// --- HUB LOGIC ---
export function renderHubGames(filterText = "") {
    const grid = document.getElementById('hubGamesGrid');
    if(!grid) return;
    const games = allPlayedGames.filter(g => {
            if (!g.name.toLowerCase().includes(filterText.toLowerCase())) return false;
            return true;
        }).sort((a,b) => {
            if(a.isInbox) return -1; if(b.isInbox) return 1;
            return a.name.localeCompare(b.name);
        });

    grid.innerHTML = games.map(g => {
        const safeName = g.name.replace(/'/g, "\\'"); 
        return `<div class="hub-game-card" onclick="window.openGameDetails('${safeName}')"><img src="${g.cover}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'"><div class="hub-game-title">${escapeHtml(g.name)}</div></div>`;
    }).join("");
}

function renderHubGrid(containerId, items, type) {
    const container = document.getElementById(containerId);
    if(!container) return;
    if(items.length === 0) { container.innerHTML = `<div class="empty-state">No content found.</div>`; return; }

    container.innerHTML = items.map(item => {
        const isYouTube = item.vod_provider === 'youtube';
        const isOdysee = item.vod_provider === 'odysee';
        const thumbUrl = getThumbUrl(item, type);
        const title = escapeHtml(item.title || "Untitled");
        const dateStr = new Date(item.createdAt || item.created_at).toLocaleDateString();
        
        let badgeHtml = "";
        if (isYouTube) badgeHtml = `<div class="provider-badge">YouTube</div>`;
        else if (isOdysee) badgeHtml = `<div class="provider-badge" style="background:#e0245e;">Odysee</div>`;
        else if (item.is_exclusive) badgeHtml = `<div class="provider-badge" style="background:var(--accent);">Exclusive</div>`;
        
        let editBtn = "";
        if (type === 'vod' && State.isModOrOwner) {
            editBtn = `<div class="vod-edit-btn" onclick="window.openVodEditModal(event, '${item.id}')">EDIT</div>`;
        }

        return `<div class="video-card" onclick="window.handleVideoClick('${item.id}', '${type}')"><div class="video-card-thumb"><img src="${thumbUrl}" onerror="this.src='${PLACEHOLDER_IMG}'">${badgeHtml}${editBtn}<div class="video-card-dur">${item.duration || type.toUpperCase()}</div></div><div class="video-card-body"><div class="video-card-title" title="${title}">${title}</div><div class="video-card-date">${dateStr}</div></div></div>`;
    }).join("");
}

// --- OPEN GAME DETAILS ---
export async function openGameDetails(gameName) {
    const game = allPlayedGames.find(g => g.name === gameName);
    if (!game) return;
    
    document.getElementById('hub-home-view').classList.add('hidden');
    document.getElementById('hub-details-view').classList.remove('hidden');

    const summary = game.summary || "No description available.";
    const dev = game.developer || "--";
    const pub = game.publisher || "--";
    const rel = game.release_date || "--";
    const steamUrl = game.steam_url || game.steamUrl || "";
    const safeName = escapeHtml(game.name).replace(/'/g, "\\'");

    let steamBtnHtml = steamUrl ? `<a href="${steamUrl}" target="_blank" class="game-steam-btn"><img src="https://store.steampowered.com/favicon.ico" style="width:14px;height:14px;"> View on Steam</a>` : "";
    let adminBtnsHtml = (State.isModOrOwner && !game.isInbox) ? `
        <div style="display:flex; gap:5px; margin-top:10px;">
            <button onclick="window.refreshGameMetadata('${safeName}')" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.8; font-size:11px;" title="Fetch info from Steam/IGDB">↻ Info</button>
            <button onclick="window.promptRenameGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Rename">✏️</button>
            <button onclick="window.promptChangeCover()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Cover">🖼️</button>
            <button onclick="window.promptDeleteGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7; background:rgba(255,0,0,0.2); color:#ffaaaa;" title="Delete">🗑️</button>
        </div>` : "";

    const heroContentEl = document.querySelector('.game-hero-content');
    if (heroContentEl) {
        heroContentEl.innerHTML = `
            <img id="heroCover" class="game-hero-cover" src="${game.cover}" onerror="this.src='${PLACEHOLDER_IMG}'">
            <div class="game-hero-main">
                <h1 id="heroTitle" class="game-hero-title">${escapeHtml(game.name)}</h1>
                <div class="game-hero-stats">
                     <span class="game-hero-stat">📼 <span id="heroVodCount">...</span> VODs</span>
                     <span class="game-hero-stat">🎬 <span id="heroClipCount">...</span> Clips</span>
                </div>
                ${steamBtnHtml}
                ${adminBtnsHtml}
            </div>
            <div class="game-hero-details">
                <div id="heroDescription" class="game-desc-text">${escapeHtml(summary)}</div>
                <div class="game-meta-grid">
                    <div class="game-meta-item"><span class="meta-label">Developer</span><span id="heroDev" class="meta-value">${escapeHtml(dev)}</span></div>
                    <div class="game-meta-item"><span class="meta-label">Publisher</span><span id="heroPub" class="meta-value">${escapeHtml(pub)}</span></div>
                    <div class="game-meta-item"><span class="meta-label">Release</span><span id="heroRelease" class="meta-value">${escapeHtml(rel)}</span></div>
                </div>
            </div>
        `;
    }

    const heroBg = document.getElementById('heroBg');
    if (heroBg) heroBg.style.backgroundImage = `url('${game.cover}')`;

    activeGameVods = [];
    if (game.isInbox) {
        activeGameVods = vodsData.filter(v => !v.game_name);
    } else {
        try {
            const encoded = encodeURIComponent(game.name);
            const { data } = await apiGet(`/streams/list?game=${encoded}&limit=100`);
            activeGameVods = data.streams || [];
        } catch(e) { console.error("Failed to load game videos", e); }
    }

    const targetGameLower = game.name.toLowerCase();
    const filteredContent = activeGameVods.filter(v => v.vod_provider !== 'bunny');

    // Sort DESCENDING (Newest First)
    const gameVods = filteredContent.filter(v => !v.type || v.type === 'vod')
        .sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));

    const gameVideos = filteredContent.filter(v => v.type === 'video')
        .sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));

    const gameClips = clipsData.filter(c => {
        if (c.game) return c.game.toLowerCase() === targetGameLower;
        return (c.title || "").toLowerCase().includes(targetGameLower);
    });

    const vodCountEl = document.getElementById('heroVodCount');
    const clipCountEl = document.getElementById('heroClipCount');
    if(vodCountEl) vodCountEl.innerText = gameVods.length + gameVideos.length; 
    if(clipCountEl) clipCountEl.innerText = gameClips.length;

    renderHubGrid('hub-content-vods', gameVods, 'vod');
    renderHubGrid('hub-content-videos', gameVideos, 'vod');
    renderHubGrid('hub-content-clips', gameClips, 'clip');
    
    if (gameVods.length === 0 && gameVideos.length > 0) switchHubTab('videos');
    else switchHubTab('vods');
}

export function openHubHome() {
    document.getElementById('hub-details-view').classList.add('hidden');
    document.getElementById('hub-home-view').classList.remove('hidden');
    closeVideoStage(); 
}

export function switchHubTab(tabName) {
    document.querySelectorAll('.hub-tab').forEach(b => {
        if(b.textContent.toLowerCase().includes(tabName)) b.classList.add('active');
        else b.classList.remove('active');
    });
    ['vods', 'videos', 'clips'].forEach(t => {
        const el = document.getElementById(`hub-content-${t}`);
        if(t === tabName) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

// --- PLAYER ---
export async function playVideo(item, type) {
    activeVideoItem = item; activeVideoType = type;
    
    // Layout
    const videoCol = document.querySelector('.col-video');
    if(videoCol) videoCol.classList.add('watching');
    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.remove('hidden');
    if(stage) stage.scrollIntoView({ behavior: 'smooth' });

    // Metadata
    document.getElementById('meta-title').textContent = item.title || "Untitled";
    document.getElementById('meta-date').textContent = new Date(item.createdAt || item.created_at).toLocaleDateString();
    
    let tagLabel = "Broadcast Archive";
    if(type === 'clip') tagLabel = "Live Clip";
    else if (item.vod_provider === 'youtube') tagLabel = "Archive (YouTube)";
    else if (item.vod_provider === 'odysee') tagLabel = "Archive (Odysee)";
    document.getElementById('meta-tag').textContent = tagLabel;
    
    const btnDownload = document.getElementById('btn-download');
    if(btnDownload) btnDownload.style.display = 'none'; 
    const qualitySelect = document.getElementById('videoQualitySelect');
    if(qualitySelect) qualitySelect.style.display = 'none'; 

    const videoParent = mainVideoPlayer.parentNode;
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    const existingOdysee = document.getElementById('nexus-odysee-embed');

    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
    if(existingOdysee) existingOdysee.remove();
    
    mainVideoPlayer.style.display = 'none'; 
    mainVideoPlayer.removeAttribute('src');
    mainVideoPlayer.innerHTML = ''; 

    // --- YOUTUBE LOGIC (INVIDIOUS PROXY) ---
    // Using Invidious bypasses the "Bot" check because it doesn't use Google's player.
    if (item.vod_provider === 'youtube') {
        const wrapper = document.createElement('div');
        wrapper.id = 'nexus-youtube-embed'; 
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        wrapper.style.position = 'relative';

        const coverDiv = document.createElement('div');
        coverDiv.style.position = 'absolute';
        coverDiv.style.inset = '0';
        coverDiv.style.background = `url('https://img.youtube.com/vi/${item.id}/maxresdefault.jpg') center/cover`;
        coverDiv.style.cursor = 'pointer';
        coverDiv.style.display = 'flex';
        coverDiv.style.alignItems = 'center';
        coverDiv.style.justifyContent = 'center';
        coverDiv.style.zIndex = '10';
        coverDiv.innerHTML = `<div style="font-size:60px; color:#fff; text-shadow:0 0 20px rgba(0,0,0,0.5);">▶</div>`;
        wrapper.appendChild(coverDiv);

        coverDiv.onclick = () => {
            coverDiv.remove();
            const iframe = document.createElement('iframe');
            
            // USING INVIDIOUS INSTANCE TO BYPASS BLOCKS
            // You can change 'invidious.jing.rocks' to another instance if this one is slow
            iframe.src = `https://invidious.jing.rocks/embed/${item.id}?autoplay=1`;
            
            iframe.style.width = '100%'; 
            iframe.style.height = '100%'; 
            iframe.style.border = 'none';
            iframe.allowFullscreen = true;
            wrapper.appendChild(iframe);
        };

        videoParent.appendChild(wrapper);
        return;
    }

    // --- ODYSEE LOGIC ---
    if (item.vod_provider === 'odysee') {
        const wrapper = document.createElement('div');
        wrapper.id = 'nexus-odysee-embed'; 
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://odysee.com/$/embed/${item.id}`; // Uses Claim ID
        iframe.style.width = '100%'; 
        iframe.style.height = '100%'; 
        iframe.style.border = 'none';
        iframe.allowFullscreen = true;
        
        wrapper.appendChild(iframe);
        videoParent.appendChild(wrapper);
        return;
    }

    // --- NATIVE / BUNNY LOGIC ---
    if (item.url) {
        mainVideoPlayer.style.display = 'block';
        if (typeof Hls !== 'undefined' && Hls.isSupported() && item.url.endsWith('.m3u8')) {
            const hls = new Hls(); hls.loadSource(item.url); hls.attachMedia(mainVideoPlayer);
        } else { 
            const source = document.createElement('source');
            source.src = item.url;
            source.type = 'video/mp4';
            mainVideoPlayer.appendChild(source);
            mainVideoPlayer.load();
        }
        mainVideoPlayer.play().catch(e => console.log("Autoplay blocked", e));
        if(btnDownload) { btnDownload.href = item.url; btnDownload.style.display = 'inline-block'; }
    }
}

export function handleVideoClick(id, type) {
    let item = vodsData.find(i => i.id === id);
    if(type === 'clip') item = clipsData.find(i => i.id === id);
    if (!item && activeGameVods.length > 0) item = activeGameVods.find(i => i.id === id);
    if(item) playVideo(item, type);
    else console.warn("Video not found:", id);
}

export function closeVideoStage() {
    const videoCol = document.querySelector('.col-video');
    if(videoCol) videoCol.classList.remove('watching');
    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.add('hidden');
    
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    const existingOdysee = document.getElementById('nexus-odysee-embed');

    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
    if(existingOdysee) existingOdysee.remove();

    if(mainVideoPlayer) { 
        mainVideoPlayer.pause(); 
        mainVideoPlayer.removeAttribute('src'); 
        mainVideoPlayer.innerHTML = '';
    }
}

export function shareActiveVideo() {
    if (!activeVideoItem) return;
    const url = new URL(window.location.origin);
    if (activeVideoType === 'vod') url.searchParams.set('vod', activeVideoItem.id);
    else url.searchParams.set('clip', activeVideoItem.id);
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('btn-share');
        if(btn) { btn.innerText = "Copied!"; setTimeout(() => btn.innerText = "Share", 2000); } 
        else alert("Link copied!");
    }).catch(() => prompt("Copy this link:", shareUrl));
}

export function toggleMainView(mode) {
    const liveEls = document.querySelectorAll('.live-view');
    const videoCol = document.querySelector('.col-video'); 
    const btnLive = document.getElementById('viewBtnLive');
    const btnVideo = document.getElementById('viewBtnVideo');
    if (mode === 'live') {
        liveEls.forEach(el => el.classList.remove('hidden'));
        if (videoCol) videoCol.classList.add('hidden');
        if (btnLive) btnLive.classList.add('active');
        if (btnVideo) btnVideo.classList.remove('active');
    } else {
        liveEls.forEach(el => el.classList.add('hidden'));
        if (videoCol) videoCol.classList.remove('hidden');
        if (btnLive) btnLive.classList.remove('active');
        if (btnVideo) btnVideo.classList.add('active');
    }
}

// --- FOLDER MANAGEMENT ---
window.refreshGameMetadata = async function(gameName) {
    const btn = document.activeElement;
    const oldText = btn ? btn.innerText : "↻ Info";
    if(btn) { btn.innerText = "Wait..."; btn.disabled = true; }
    try {
        const { data } = await apiPost('/played/refresh-metadata', { name: gameName });
        if (data && data.ok) {
            alert(`Updated!\n\nDeveloper: ${data.data.developer}\nRelease: ${data.data.release_date}`);
            const game = allPlayedGames.find(g => g.name === gameName);
            if(game) {
                game.summary = data.data.summary;
                game.developer = data.data.developer;
                game.publisher = data.data.publisher;
                game.release_date = data.data.release_date;
                game.steam_url = data.data.steam_url;
                if (data.data.cover) game.cover = data.data.cover;
            }
            openGameDetails(gameName); 
        } else { alert("Could not find game info on IGDB."); }
    } catch(e) { console.error(e); alert("Error refreshing metadata."); } 
    finally { if(btn) { btn.innerText = oldText; btn.disabled = false; } }
};

export async function promptRenameGame() {
    const oldNameElement = document.getElementById('heroTitle');
    const oldName = oldNameElement ? oldNameElement.innerText : "";
    if(!oldName) return;
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    if (!confirm(`This will move all videos from "${oldName}" to "${newName}"?\n\nProceed?`)) return;
    try {
        const { res, data } = await apiPost('/played/rename', { oldName, newName });
        if (res.ok) {
            alert(`Success! Moved ${data.count} videos.`);
            await loadVideoData(); openGameDetails(newName);
        } else { alert("Error: " + (data.error || "Move failed")); }
    } catch(e) { alert("Network error during move."); }
}

export async function promptChangeCover() {
    const titleEl = document.getElementById('heroTitle');
    if (!titleEl) return;
    const gameName = titleEl.innerText;
    const newCover = prompt(`Enter new Cover URL for "${gameName}":\n\n(Type "auto" to search SteamGridDB)`, "auto");
    if (!newCover) return; 
    try {
        const { res, data } = await apiPost('/played/set-cover', { name: gameName, cover: newCover });
        if (res.ok && data.cover) {
            const localGame = allPlayedGames.find(g => g.name.toLowerCase() === gameName.toLowerCase());
            if (localGame) { localGame.cover = data.cover; localGame.isVirtual = false; } else { allPlayedGames.push({ name: gameName, cover: data.cover }); }
            renderHubGames(document.getElementById('hubSearchInput')?.value || "");
            alert("Cover updated!");
        } else { alert("Failed to update cover."); }
    } catch(e) { alert("Error updating cover."); }
}

export async function promptDeleteGame() {
    const titleEl = document.getElementById('heroTitle');
    if (!titleEl) return;
    const gameName = titleEl.innerText;
    const game = allPlayedGames.find(g => g.name === gameName);
    if (!game) return;
    if (game.isInbox) { alert("You cannot delete the Inbox."); return; }
    if (!confirm(`Are you sure you want to delete the folder "${gameName}"?`)) return;
    if (game.__index === undefined || game.__index === -1) { alert("Cannot delete (virtual folder)."); return; }
    try {
        const { res } = await apiPost('/played/delete', { index: game.__index });
        if (res.ok) {
            const localArrayIndex = allPlayedGames.indexOf(game);
            if (localArrayIndex > -1) allPlayedGames.splice(localArrayIndex, 1);
            alert("Folder deleted!"); openHubHome(); renderHubGames(); 
        } else { alert("Failed to delete."); }
    } catch(e) { alert("Error deleting folder."); }
}

// --- LEGACY SIDEBAR ---
function renderPlayedGames(list) {
  const gamesPlayedEl = document.getElementById("gamesPlayed");
  if (!gamesPlayedEl) return;
  gamesPlayedEl.innerHTML = list.map(g => {
    const isCurrent = currentGameName && (g.name || "").toLowerCase() === currentGameName.toLowerCase();
    return `<div class="game-card ${isCurrent ? "current-game" : ""}" tabindex="0" role="button" onclick="window.handleGameCardClick(this)" data-name="${escapeHtml(g.name)}" data-desc="${escapeHtml(g.description || "")}" data-cover="${escapeHtml(g.cover || "")}" data-steam="${escapeHtml(g.steamUrl || "")}"><div class="game-thumb"><img loading="lazy" src="${g.cover}" alt="${escapeHtml(g.name)}"></div></div>`;
  }).join("");
}

export function updatePlayedGamesList(gameName) {
  if (!gameName) return;
  const isSameGame = currentGameName && gameName.toLowerCase() === currentGameName.toLowerCase();
  currentGameName = gameName; 
  let foundIndex = allPlayedGames.findIndex(g => (g.name || "").toLowerCase() === gameName.toLowerCase());
  if (foundIndex > -1) { 
      const game = allPlayedGames.splice(foundIndex, 1)[0]; allPlayedGames.unshift(game); 
  } else { 
      const placeholderCover = "https://via.placeholder.com/300x450?text=" + encodeURIComponent(gameName);
      allPlayedGames.unshift({ name: gameName, cover: placeholderCover, __index: -1 }); 
  }
  const coverImg = document.getElementById("gameCoverImage");
  if (coverImg && allPlayedGames.length > 0) coverImg.src = allPlayedGames[0].cover;
  renderPlayedGames(allPlayedGames);
}

export function handleGameCardClick(el) {
    const gameInfoModalEl = document.getElementById("gameInfoModal");
    if(!gameInfoModalEl) return;
    document.getElementById("gameInfoTitle").innerText = el.dataset.name; 
    document.getElementById("gameInfoCover").src = el.dataset.cover; 
    document.getElementById("gameInfoText").innerText = el.dataset.desc || "No description available.";
    const btn = document.getElementById("gameSteamBtn");
    if(el.dataset.steam) { btn.style.display = "inline-block"; btn.href = el.dataset.steam; } else { btn.style.display = "none"; }
    gameInfoModalEl.classList.add("open");
}

document.addEventListener("DOMContentLoaded", () => {
    const clipBtn = document.getElementById("clipBtn");
    if (clipBtn) {
        clipBtn.addEventListener("click", async () => {
            if (!State.user) { addSystemMessage("You must be logged in to clip!", "error"); return; }
            addSystemMessage("Clip is being created...", "loading");
            clipBtn.disabled = true;
            try {
                const { res, data } = await apiPost("/clips/create", { windowSeconds: 30 });
                if (res.ok && data.id) {
                    const watchLink = `${window.location.origin}/?clip=${data.id}`;
                    navigator.clipboard.writeText(watchLink).catch(() => {});
                } else { addSystemMessage(data.error || "Failed to create clip.", "error"); }
            } catch (e) { addSystemMessage("Network Error", "error"); } finally { clipBtn.disabled = false; }
        });
    }
});

// Global Exports
window.openGameDetails = openGameDetails;
window.openHubHome = openHubHome;
window.handleVideoClick = handleVideoClick;
window.promptRenameGame = promptRenameGame;
window.promptChangeCover = promptChangeCover;
window.promptDeleteGame = promptDeleteGame;
window.handleGameCardClick = handleGameCardClick;