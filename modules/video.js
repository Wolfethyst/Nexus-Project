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
    
    // Cloudflare Fallback
    const vidId = item.videoId || item.cloudflare_id; 
    if(vidId) return `https://customer-${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${vidId}/thumbnails/thumbnail.jpg`;
    
    return PLACEHOLDER_IMG;
}

// [UPDATED] Prioritized Loading Sequence
export async function loadVideoData() {
    // 1. Check if the user is visiting a specific link (Direct Play)
    const params = new URLSearchParams(window.location.search);
    const directClipId = params.get("clip");
    const directVodId = params.get("vod");

    // 2. If there is a direct link, load and play it IMMEDIATELY
    if (directClipId) {
        try {
            // Fetch JUST this clip metadata first (Fast!)
            const { data } = await apiGet(`/clips/meta?id=${directClipId}`);
            if (data && data.ok && data.clip) {
                playVideo(data.clip, 'clip'); 
            }
        } catch(e) { console.error("Fast load failed", e); }
    } 

    // 3. Load the rest of the site content in the background
    const heavyLifting = Promise.all([
        loadGames().then(() => {
            // Re-apply current game cover if we know it
            if (currentGameName) updatePlayedGamesList(currentGameName);
            else renderHubGames();
        }),
        loadStreamTitle(),
        loadClips(),
        loadVods().then(() => {
            // Handle Direct VOD link (only possible after VOD list loads)
            if (directVodId && vodsData.length > 0) {
                handleVideoClick(directVodId, 'vod');
            }
        })
    ]);

    await heavyLifting;

    // --- [NEW] HIDE LOADER WHEN DONE ---
    const loader = document.getElementById("appLoader");
    if(loader) {
        // Small delay to ensure images paint
        setTimeout(() => loader.classList.add("hidden"), 500); 
    }
}

async function loadGames() {
    const { data } = await apiGet("/played");
    // Load the fresh list from the server
    allPlayedGames = (data?.games || []).map((g, i) => ({ ...g, __index: i }));

    // [NEW] If we already know what game is playing, re-apply it to the new list!
    // This ensures we pull the REAL cover art instead of a placeholder
    if (currentGameName) {
        updatePlayedGamesList(currentGameName);
    } else {
        renderHubGames(); // Otherwise just render the library normally
    }
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
    
    // [UPDATED] Target the text inside the new Compact Card
    const statusText = document.getElementById("liveStatusCardText");

    if (data) {
        if(titleInput) titleInput.value = data.title || "";
        if(gameInput) gameInput.value = data.game || "";
        
        if(titleLabel) titleLabel.textContent = data.title || "Stream Title";
        if(gameLabel) gameLabel.textContent = data.game || "Just Chatting"; // Now shows inside card title

        // Update the Compact Card Status
        if (data.live) {
            if(statusText) {
                statusText.textContent = "● Live";
                statusText.style.color = "#72ffb0"; // Bright Green
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
        const thumbUrl = getThumbUrl(item, type);
        const title = escapeHtml(item.title || "Untitled");
        const dateStr = new Date(item.createdAt || item.created_at).toLocaleDateString();
        let badgeHtml = "";
        if (isYouTube) badgeHtml = `<div class="provider-badge">YouTube</div>`;
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

    let steamBtnHtml = "";
    if (steamUrl) {
        steamBtnHtml = `<a href="${steamUrl}" target="_blank" class="game-steam-btn"><img src="https://store.steampowered.com/favicon.ico" style="width:14px;height:14px;"> View on Steam</a>`;
    }

    let adminBtnsHtml = "";
    if (State.isModOrOwner && !game.isInbox) {
        const safeName = escapeHtml(game.name).replace(/'/g, "\\'");
        adminBtnsHtml = `
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="window.refreshGameMetadata('${safeName}')" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.8; font-size:11px;" title="Fetch info from Steam/IGDB">↻ Info</button>
                <button onclick="window.promptRenameGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Rename">✏️</button>
                <button onclick="window.promptChangeCover()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Cover">🖼️</button>
                <button onclick="window.promptDeleteGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7; background:rgba(255,0,0,0.2); color:#ffaaaa;" title="Delete">🗑️</button>
            </div>
        `;
    }

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

    // [FIXED] Sort DESCENDING (Newest First)
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

// src/modules/video.js

// --- PLAYER ---
export function playVideo(item, type) {
    activeVideoItem = item; activeVideoType = type;
    
    // Activate "Watching Mode" Layout
    const videoCol = document.querySelector('.col-video');
    if(videoCol) videoCol.classList.add('watching');

    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.remove('hidden');
    if(stage) stage.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('meta-title').textContent = item.title || "Untitled";
    document.getElementById('meta-date').textContent = new Date(item.createdAt || item.created_at).toLocaleDateString();
    
    let tagLabel = "Broadcast Archive";
    if(type === 'clip') tagLabel = "Live Clip";
    else if (item.vod_provider === 'youtube') tagLabel = "Archive (YouTube)";
    document.getElementById('meta-tag').textContent = tagLabel;
    
    const btnDownload = document.getElementById('btn-download');
    const qualitySelect = document.getElementById('videoQualitySelect');
    if(qualitySelect) qualitySelect.style.display = 'none'; 

    const videoParent = mainVideoPlayer.parentNode;
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
    
    mainVideoPlayer.style.display = 'none'; 
    mainVideoPlayer.removeAttribute('src');
    mainVideoPlayer.innerHTML = ''; 

    if(btnDownload) btnDownload.style.display = 'none'; 

    if (item.vod_provider === 'youtube') {
        const wrapper = document.createElement('div');
        wrapper.id = 'nexus-youtube-embed';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        wrapper.style.position = 'relative';
        wrapper.style.cursor = 'pointer';
        
        // High-res thumbnail
        wrapper.style.backgroundImage = `url('https://img.youtube.com/vi/${item.id}/maxresdefault.jpg')`;
        wrapper.style.backgroundSize = 'cover';
        wrapper.style.backgroundPosition = 'center';

        const playBtn = document.createElement('div');
        playBtn.innerHTML = "▶";
        playBtn.style.position = 'absolute';
        playBtn.style.top = '50%';
        playBtn.style.left = '50%';
        playBtn.style.transform = 'translate(-50%, -50%)';
        playBtn.style.fontSize = '60px';
        playBtn.style.color = '#fff';
        playBtn.style.textShadow = '0 0 20px rgba(0,0,0,0.5)';
        playBtn.style.pointerEvents = 'none'; 
        wrapper.appendChild(playBtn);

        wrapper.onclick = () => {
            const iframe = document.createElement('iframe');
            
            // [FIX] Use nocookie domain + encoded origin
            const origin = encodeURIComponent(window.location.origin);
            iframe.src = `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&modestbranding=1&rel=0&origin=${origin}`;
            
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            
            // [FIX] Add Referrer Policy to satisfy new browser security rules
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            
            iframe.style.width = '100%'; 
            iframe.style.height = '100%'; 
            iframe.style.border = 'none';
            
            wrapper.innerHTML = ''; 
            wrapper.appendChild(iframe);
        };

        videoParent.appendChild(wrapper);
        return;
    }

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
    
    if (!item && activeGameVods.length > 0) {
        item = activeGameVods.find(i => i.id === id);
    }

    if(item) playVideo(item, type);
    else console.warn("Video not found:", id);
}

export function closeVideoStage() {
    // [UPDATED] Deactivate "Watching Mode"
    const videoCol = document.querySelector('.col-video');
    if(videoCol) videoCol.classList.remove('watching');

    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.add('hidden');
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
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
    const videoCol = document.querySelector('.col-video'); // Explicit selector
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
        } else {
            console.warn("Refresh failed:", data);
            alert("Could not find game info on IGDB.");
        }
    } catch(e) { console.error(e); alert("Error refreshing metadata."); } 
    finally { if(btn) { btn.innerText = oldText; btn.disabled = false; } }
};

export async function promptRenameGame() {
    const oldNameElement = document.getElementById('heroTitle');
    const oldName = oldNameElement ? oldNameElement.innerText : "";
    if(!oldName) return;
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    if (!confirm(`This will move all videos from "${oldName}" to "${newName}" and rename the folder permanently.\n\nProceed?`)) return;

    const btn = document.querySelector(".panelSmallBtn[title='Rename']");
    const originalText = btn ? btn.innerText : "";
    if(btn) btn.innerText = "Moving...";

    try {
        const { res, data } = await apiPost('/played/rename', { oldName, newName });
        if (res.ok) {
            alert(`Success! Moved ${data.count} videos.`);
            await loadVideoData(); 
            openGameDetails(newName);
        } else {
            alert("Error: " + (data.error || "Move failed"));
        }
    } catch(e) {
        console.error(e);
        alert("Network error during move.");
    } finally {
        if(btn) btn.innerText = originalText;
    }
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
            const heroBg = document.getElementById('heroBg'); const heroCover = document.getElementById('heroCover');
            if(heroCover) heroCover.src = data.cover; if(heroBg) heroBg.style.backgroundImage = `url('${data.cover}')`;
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
    if (!confirm(`Are you sure you want to delete the folder "${gameName}"?\n\nThis does NOT delete videos, only the folder entry.`)) return;
    if (game.__index === undefined || game.__index === -1) { alert("Cannot delete (virtual folder). Refresh page."); return; }
    try {
        const { res } = await apiPost('/played/delete', { index: game.__index });
        if (res.ok) {
            const localArrayIndex = allPlayedGames.indexOf(game);
            if (localArrayIndex > -1) allPlayedGames.splice(localArrayIndex, 1);
            allPlayedGames.forEach(g => { if (g.__index > game.__index) g.__index -= 1; });
            alert("Folder deleted!");
            openHubHome();   
            renderHubGames(); 
        } else { alert("Failed to delete."); }
    } catch(e) { alert("Error deleting folder."); }
}

// --- LEGACY SIDEBAR GAMES LIST ---
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
  
  // 1. Update the internal tracker
  const isSameGame = currentGameName && gameName.toLowerCase() === currentGameName.toLowerCase();
  currentGameName = gameName; 

  // 2. Find the game in your list or create a temporary one
  let foundIndex = allPlayedGames.findIndex(g => (g.name || "").toLowerCase() === gameName.toLowerCase());
  
  if (foundIndex > -1) { 
      // Game found! Move it to the top
      const game = allPlayedGames.splice(foundIndex, 1)[0]; 
      allPlayedGames.unshift(game); 
  } else { 
      // Game not in list? Add a temporary entry so it shows up immediately
      // We use a placeholder first, but if the real list loads later, we'll fix it (see Step 2)
      const placeholderCover = "https://via.placeholder.com/300x450?text=" + encodeURIComponent(gameName);
      allPlayedGames.unshift({ name: gameName, cover: placeholderCover, __index: -1 }); 
  }

  // 3. [NEW] Update the Big Cover Image (This was missing!)
  const coverImg = document.getElementById("gameCoverImage");
  if (coverImg && allPlayedGames.length > 0) {
      // Use the cover from the top game (which we just ensured is the current one)
      coverImg.src = allPlayedGames[0].cover;
  }

  // 4. Update the sidebar list
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

// --- CLIP BUTTON HANDLER (Uses Chat System) ---
document.addEventListener("DOMContentLoaded", () => {
    const clipBtn = document.getElementById("clipBtn");
    if (clipBtn) {
        clipBtn.addEventListener("click", async () => {
            if (!State.user) { 
                addSystemMessage("You must be logged in to clip!", "error"); 
                return; 
            }

            // 1. Notify "Creating..."
            addSystemMessage("Clip is being created and will be available shortly...", "loading");
            clipBtn.disabled = true;

            try {
                const { res, data } = await apiPost("/clips/create", { windowSeconds: 30 });
                
                if (res.ok && data.id) {
                    // Success!
                    // We DO NOT add a "Clip Ready" message here locally. 
                    // The server now broadcasts it via the Chat Room so both the Dock and Dashboard see it.
                    
                    // We can still copy the link silently for convenience
                    const watchLink = `${window.location.origin}/?clip=${data.id}`;
                    navigator.clipboard.writeText(watchLink).catch(() => {});
                } else {
                    addSystemMessage(data.error || "Failed to create clip.", "error");
                }
            } catch (e) {
                addSystemMessage("Network Error", "error");
            } finally {
                clipBtn.disabled = false;
            }
        });
    }
});

// Attach to window so onclick attributes work
window.openGameDetails = openGameDetails;
window.openHubHome = openHubHome;
window.handleVideoClick = handleVideoClick;
window.promptRenameGame = promptRenameGame;
window.promptChangeCover = promptChangeCover;
window.promptDeleteGame = promptDeleteGame;
window.handleGameCardClick = handleGameCardClick;