const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
let library = JSON.parse(localStorage.getItem('mm_library')) || [{name: "Мой Плейлист", tracks: []}];
let activePlaylistIndex = 0;
let currentTrackIndexInPlaylist = -1;
let currentTrackData = null; // Данные играющего сейчас трека
let tempTrackToAdd = null; 

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

function togglePanel(panelId) {
    ['side-search', 'side-playlist', 'side-themes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) id === panelId ? el.classList.toggle('active') : el.classList.remove('active');
    });
}

// --- УПРАВЛЕНИЕ БИБЛИОТЕКОЙ ---

function showPlaylistManager() {
    const area = document.getElementById('playlist-content-area');
    const title = document.getElementById('playlist-view-title');
    const tools = document.getElementById('playlist-manager-tools');
    title.innerText = "Библиотека";
    tools.style.display = "block";
    area.innerHTML = library.map((pl, index) => `
        <div class="list-item">
            <i class="fas fa-folder" style="color:var(--accent); font-size: 20px;"></i>
            <div style="flex:1" onclick="openPlaylist(${index})">
                <div style="font-weight:bold">${pl.name}</div>
                <div style="font-size:11px; opacity:0.5">${pl.tracks.length} треков</div>
            </div>
            <button onclick="deletePlaylist(${index})" style="background:none; border:none; color:#ff4757"><i class="fas fa-trash-alt"></i></button>
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
    if (library.length <= 1) return;
    if (confirm(`Удалить плейлист "${library[index].name}"?`)) {
        library.splice(index, 1);
        saveLibrary();
        showPlaylistManager();
    }
}

function openPlaylist(index) {
    activePlaylistIndex = index;
    const area = document.getElementById('playlist-content-area');
    const title = document.getElementById('playlist-view-title');
    document.getElementById('playlist-manager-tools').style.display = "none";
    title.innerText = library[index].name;
    
    area.innerHTML = library[index].tracks.map((t, i) => `
        <div class="list-item">
            <div style="flex:1" onclick="playFromLibrary(${index}, ${i})">
                <div style="font-size:13px; font-weight:500">${t.title}</div>
            </div>
            <button onclick="removeFromPlaylist(${i})" style="background:none; border:none; color:#ff4757; font-size:22px">&times;</button>
        </div>
    `).join('') || '<p style="text-align:center; opacity:0.5; margin-top:20px;">Плейлист пуст</p>';
}

function closePlaylistView() {
    const tools = document.getElementById('playlist-manager-tools');
    tools.style.display === "none" ? showPlaylistManager() : togglePanel('');
}

// --- ПОИСК И ДОБАВЛЕНИЕ ---

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

function openAddModal(id, title) {
    tempTrackToAdd = { id, title };
    const list = document.getElementById('target-playlist-list');
    list.innerHTML = library.map((pl, i) => `
        <div onclick="addTrackToPlaylist(${i})" style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:15px; display:flex; justify-content:space-between">
            <span>${pl.name}</span>
            <i class="fas fa-chevron-right" style="opacity:0.3"></i>
        </div>
    `).join('');
    document.getElementById('add-to-modal').style.display = 'flex';
}

function addTrackToPlaylist(plIndex) {
    library[plIndex].tracks.push(tempTrackToAdd);
    saveLibrary();
    closeModal();
    updateQuickAddBtn();
}

function closeModal() { document.getElementById('add-to-modal').style.display = 'none'; }

function removeFromPlaylist(trackIdx) {
    library[activePlaylistIndex].tracks.splice(trackIdx, 1);
    saveLibrary();
    openPlaylist(activePlaylistIndex);
    updateQuickAddBtn();
}

// --- ПЛЕЕР И КНОПКА PLAY ---

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

function updateQuickAddBtn() {
    if (!currentTrackData) return;
    const btn = document.getElementById('quick-add-btn');
    const isAdded = library.some(pl => pl.tracks.some(t => t.id === currentTrackData.id));
    
    if (isAdded) {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add('added');
        btn.onclick = () => alert("Трек уже есть в вашей библиотеке!");
    } else {
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        btn.classList.remove('added');
        btn.onclick = () => openAddModal(currentTrackData.id, currentTrackData.title);
    }
}

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const glow = document.getElementById('vinyl-glow');
    const playBtn = document.getElementById('play-btn');
    
    if (event.data == YT.PlayerState.PLAYING) { 
        disk.style.animationPlayState = 'running'; 
        glow.classList.add('playing');
        playBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
    } else { 
        disk.style.animationPlayState = 'paused'; 
        glow.classList.remove('playing');
        playBtn.innerHTML = '<i class="fas fa-play"></i>'; 
    }
    
    if (event.data == YT.PlayerState.ENDED && currentTrackIndexInPlaylist !== -1) {
        if (currentTrackIndexInPlaylist < library[activePlaylistIndex].tracks.length - 1) {
            playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist + 1);
        }
    }
}

document.getElementById('play-btn').onclick = () => {
    const state = player.getPlayerState();
    state == 1 ? player.pauseVideo() : player.playVideo();
};

document.getElementById('next-btn').onclick = () => {
    if (currentTrackIndexInPlaylist !== -1 && currentTrackIndexInPlaylist < library[activePlaylistIndex].tracks.length - 1) {
        playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist + 1);
    }
};

document.getElementById('prev-btn').onclick = () => {
    if (currentTrackIndexInPlaylist > 0) {
        playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist - 1);
    }
};

// --- ВСПОМОГАТЕЛЬНОЕ ---
function startTick() {
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const current = player.getCurrentTime();
            const total = player.getDuration();
            if(total > 0) {
                document.getElementById('progress-bar').value = (current / total) * 100;
                document.getElementById('current-time').innerText = formatTime(current);
                document.getElementById('duration').innerText = formatTime(total);
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