const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
let library = JSON.parse(localStorage.getItem('mm_library')) || [{name: "Мои любимые", tracks: []}];
let activePlaylistIndex = 0;
let currentTrackIndexInPlaylist = -1;
let currentTrackData = null; 
let tempTrackToAdd = null; 
let isShuffle = false;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        height: '0', width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

function togglePanel(panelId) {
    ['side-search', 'side-playlist', 'side-themes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) id === panelId ? el.classList.toggle('active') : el.classList.remove('active');
    });
}

// --- БИБЛИОТЕКА ---
function showPlaylistManager() {
    const area = document.getElementById('playlist-content-area');
    const tools = document.getElementById('playlist-manager-tools');
    document.getElementById('playlist-view-title').innerText = "Библиотека";
    tools.style.display = "block";
    area.innerHTML = library.map((pl, index) => `
        <div class="list-item">
            <i class="fas fa-folder" style="color:var(--accent); font-size: 18px;"></i>
            <div style="flex:1" onclick="openPlaylist(${index})">
                <div style="font-weight:bold">${pl.name}</div>
                <div style="font-size:11px; opacity:0.5">${pl.tracks.length} треков</div>
            </div>
            <button onclick="deletePlaylist(${index})" style="background:none; border:none; color:#ff4757"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
    togglePanel('side-playlist');
}

function createNewPlaylist() {
    const input = document.getElementById('new-playlist-name');
    if (!input.value.trim()) return;
    library.push({ name: input.value.trim(), tracks: [] });
    input.value = '';
    saveLibrary();
    showPlaylistManager();
}

function deletePlaylist(index) {
    if (library.length <= 1 || !confirm("Удалить этот плейлист?")) return;
    library.splice(index, 1);
    saveLibrary();
    showPlaylistManager();
}

function openPlaylist(index) {
    activePlaylistIndex = index;
    const area = document.getElementById('playlist-content-area');
    document.getElementById('playlist-view-title').innerText = library[index].name;
    document.getElementById('playlist-manager-tools').style.display = "none";
    area.innerHTML = library[index].tracks.map((t, i) => `
        <div class="list-item">
            <div style="flex:1" onclick="playFromLibrary(${index}, ${i})">
                <div style="font-size:13px; font-weight:500">${t.title}</div>
            </div>
            <button onclick="removeFromPlaylistDirectly('${t.id}')" style="background:none; border:none; color:#ff4757; font-size:22px">&times;</button>
        </div>
    `).join('') || '<p style="text-align:center; opacity:0.3; margin-top:20px;">Плейлист пуст</p>';
}

function closePlaylistView() {
    const tools = document.getElementById('playlist-manager-tools');
    tools.style.display === "none" ? showPlaylistManager() : togglePanel('');
}

// --- ПОИСК ---
document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
    const data = await res.json();
    if (data.items) renderSearchResults(data.items);
};

function renderSearchResults(items) {
    const container = document.getElementById('search-results');
    container.innerHTML = items.map(item => {
        const id = item.id.videoId;
        const title = item.snippet.title.replace(/'/g, "");
        return `
            <div class="list-item">
                <img src="${item.snippet.thumbnails.default.url}" style="width:50px; border-radius:10px">
                <div style="flex:1; font-size:13px; font-weight:500" onclick="playInstant('${id}', '${title}')">${title}</div>
                <button onclick="openAddModal('${id}', '${title}')" style="background:var(--accent); border:none; border-radius:10px; padding:10px; color:#000"><i class="fas fa-plus"></i></button>
            </div>
        `;
    }).join('');
}

// --- УПРАВЛЕНИЕ КНОПКОЙ ДОБАВЛЕНИЯ ---
function openAddModal(id, title) {
    tempTrackToAdd = { id, title };
    const list = document.getElementById('target-playlist-list');
    list.innerHTML = library.map((pl, i) => `
        <div onclick="addTrackToPlaylist(${i})" style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:15px; cursor:pointer;">
            ${pl.name}
        </div>
    `).join('');
    document.getElementById('add-to-modal').style.display = 'flex';
}

function addTrackToPlaylist(idx) {
    if(!library[idx].tracks.find(t => t.id === tempTrackToAdd.id)) {
        library[idx].tracks.push(tempTrackToAdd);
        saveLibrary();
    }
    closeModal();
    updateQuickAddBtn();
}

function closeModal() { document.getElementById('add-to-modal').style.display = 'none'; }

function removeFromPlaylistDirectly(id) {
    library.forEach(pl => pl.tracks = pl.tracks.filter(t => t.id !== id));
    saveLibrary();
    updateQuickAddBtn();
    if(document.getElementById('playlist-manager-tools').style.display === "none") openPlaylist(activePlaylistIndex);
}

// --- ПЛЕЕР ---
function playInstant(id, title) {
    currentTrackData = { id, title };
    player.loadVideoById(id);
    document.getElementById('player-title').innerText = title;
    document.getElementById('current-playlist-name').innerText = "";
    currentTrackIndexInPlaylist = -1;
    updateQuickAddBtn();
    togglePanel('');
}

function playFromLibrary(plIdx, trackIdx) {
    activePlaylistIndex = plIdx;
    currentTrackIndexInPlaylist = trackIdx;
    currentTrackData = library[plIdx].tracks[trackIdx];
    player.loadVideoById(currentTrackData.id);
    document.getElementById('player-title').innerText = currentTrackData.title;
    document.getElementById('current-playlist-name').innerText = library[plIdx].name;
    updateQuickAddBtn();
    togglePanel('');
}

// SHUFFLE
const shuffleBtn = document.getElementById('shuffle-btn');
shuffleBtn.onclick = () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
};

function getNextIdx() {
    const pl = library[activePlaylistIndex].tracks;
    if (pl.length <= 1) return currentTrackIndexInPlaylist;
    if (isShuffle) {
        let r; do { r = Math.floor(Math.random()*pl.length); } while(r === currentTrackIndexInPlaylist);
        return r;
    }
    return (currentTrackIndexInPlaylist + 1) % pl.length;
}

// КНОПКА PLAY
document.getElementById('play-btn').onclick = function() {
    const state = player.getPlayerState();
    state === 1 ? player.pauseVideo() : player.playVideo();
};

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const glow = document.getElementById('vinyl-glow');
    const playBtn = document.getElementById('play-btn');
    
    if (event.data === 1) { 
        disk.style.animationPlayState = 'running'; 
        glow.classList.add('playing');
        playBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
    } else { 
        disk.style.animationPlayState = 'paused'; 
        glow.classList.remove('playing');
        playBtn.innerHTML = '<i class="fas fa-play"></i>'; 
    }
    
    if (event.data === 0 && currentTrackIndexInPlaylist !== -1) {
        playFromLibrary(activePlaylistIndex, getNextIdx());
    }
}

function updateQuickAddBtn() {
    if (!currentTrackData) return;
    const btn = document.getElementById('quick-add-btn');
    const isAdded = library.some(pl => pl.tracks.some(t => t.id === currentTrackData.id));
    btn.innerHTML = isAdded ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';
    btn.classList.toggle('added', isAdded);
    btn.onclick = isAdded ? () => removeFromPlaylistDirectly(currentTrackData.id) : () => openAddModal(currentTrackData.id, currentTrackData.title);
}

document.getElementById('next-btn').onclick = () => {
    if (currentTrackIndexInPlaylist !== -1) playFromLibrary(activePlaylistIndex, getNextIdx());
};

document.getElementById('prev-btn').onclick = () => {
    if (currentTrackIndexInPlaylist > 0) playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist - 1);
};

// ТАЙМЕР И ПРОГРЕСС
function startTick() {
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const cur = player.getCurrentTime();
            const dur = player.getDuration();
            if(dur > 0) {
                document.getElementById('progress-bar').value = (cur / dur) * 100;
                document.getElementById('current-time').innerText = formatTime(cur);
                document.getElementById('duration').innerText = formatTime(dur);
            }
        }
    }, 1000);
}

document.getElementById('progress-bar').oninput = function() {
    if (player) player.seekTo((this.value / 100) * player.getDuration());
};

function saveLibrary() { localStorage.setItem('mm_library', JSON.stringify(library)); }
function formatTime(s) { return Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,'0'); }
function setTheme(n) { document.body.className = 'theme-'+n; togglePanel(''); }