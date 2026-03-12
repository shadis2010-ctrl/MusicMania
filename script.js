const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
// Новая структура: объект с плейлистами
let allPlaylists = JSON.parse(localStorage.getItem('allPlaylists')) || { "Главный": [] };
let currentPlaylistName = localStorage.getItem('lastPlaylist') || "Главный";
let currentTrackIndex = -1;
let currentPlayingId = '';

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

function togglePanel(panelId) {
    const panels = ['side-search', 'side-playlist', 'side-themes', 'add-to-playlist-popup'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) id === panelId ? el.classList.toggle('active') : el.classList.remove('active');
    });
}

function setTheme(name) {
    document.body.className = 'theme-' + name;
    document.getElementById('dark-mode-toggle').checked = (name !== 'white');
}

function toggleDarkWhite(isDark) {
    setTheme(isDark ? 'black' : 'white');
}

// Поиск
document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    renderResults(data.items);
};

function renderResults(items) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    items.forEach(item => {
        const id = item.id.videoId;
        const title = item.snippet.title.replace(/'/g, "");
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <img src="${item.snippet.thumbnails.default.url}" style="width:50px; border-radius:6px">
            <div style="flex:1; font-size:12px; font-weight:bold">${title.slice(0,30)}</div>
            <button onclick="event.stopPropagation(); showAddToPlaylistMenu('${id}', '${title}')" style="background:var(--accent); border:none; border-radius:6px; padding:6px; font-size:10px; font-weight:bold">+</button>
        `;
        div.onclick = () => playMusic(id, title);
        container.appendChild(div);
    });
}

// Множественные плейлисты
function showAddToPlaylistMenu(id, title) {
    const container = document.getElementById('playlists-to-choose');
    container.innerHTML = Object.keys(allPlaylists).map(name => `
        <div class="search-item" onclick="addToSpecificPlaylist('${name}', '${id}', '${title}')">
            <span>${name}</span>
        </div>
    `).join('');
    togglePanel('add-to-playlist-popup');
}

function addToSpecificPlaylist(pName, id, title) {
    if (!allPlaylists[pName].find(t => t.id === id)) {
        allPlaylists[pName].push({id, title});
        saveData();
    }
    togglePanel('');
    renderPlaylist();
}

function createNewPlaylist() {
    const name = prompt("Название нового плейлиста:");
    if (name && !allPlaylists[name]) {
        allPlaylists[name] = [];
        saveData();
        updatePlaylistSelectors();
    }
}

function switchPlaylist(name) {
    currentPlaylistName = name;
    localStorage.setItem('lastPlaylist', name);
    renderPlaylist();
}

function saveData() {
    localStorage.setItem('allPlaylists', JSON.stringify(allPlaylists));
    updatePlaylistSelectors();
}

function updatePlaylistSelectors() {
    const sel = document.getElementById('playlist-selector');
    sel.innerHTML = Object.keys(allPlaylists).map(name => 
        `<option value="${name}" ${name === currentPlaylistName ? 'selected' : ''}>${name}</option>`
    ).join('');
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    const list = allPlaylists[currentPlaylistName] || [];
    container.innerHTML = list.map((t, index) => `
        <li>
            <span style="color:var(--accent); font-weight:bold; margin-right:10px">${index + 1}</span>
            <span onclick="playFromPlaylist(${index})" style="flex:1">${t.title.slice(0, 25)}...</span>
            <button onclick="removeFromPlaylist(${index})" style="background:none; border:none; color:#ff4757; font-size:20px">&times;</button>
        </li>
    `).join('');
}

function removeFromPlaylist(index) {
    allPlaylists[currentPlaylistName].splice(index, 1);
    saveData();
    renderPlaylist();
}

function playMusic(id, title) {
    currentPlayingId = id;
    if (player && player.loadVideoById) {
        player.loadVideoById(id);
        document.getElementById('player-title').innerText = title;
        currentTrackIndex = (allPlaylists[currentPlaylistName] || []).findIndex(t => t.id === id);
    }
}

function playFromPlaylist(index) {
    const list = allPlaylists[currentPlaylistName];
    if (list && list[index]) {
        currentTrackIndex = index;
        playMusic(list[index].id, list[index].title);
        togglePanel('');
    }
}

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const btn = document.getElementById('play-btn');
    if (event.data == 1) { 
        disk.classList.add('playing'); 
        btn.innerHTML = '<i class="fas fa-pause-circle"></i>'; 
    } else { 
        disk.classList.remove('playing'); 
        btn.innerHTML = '<i class="fas fa-play-circle"></i>'; 
    }
    // Автонекст
    if (event.data == 0) {
        const list = allPlaylists[currentPlaylistName];
        if (currentTrackIndex < list.length - 1) playFromPlaylist(currentTrackIndex + 1);
    }
}

// Стандартные контроли
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

document.getElementById('play-btn').onclick = () => {
    player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo();
};

document.getElementById('next-btn').onclick = () => playFromPlaylist(currentTrackIndex + 1);
document.getElementById('prev-btn').onclick = () => playFromPlaylist(currentTrackIndex - 1);
document.getElementById('add-to-list-btn').onclick = () => {
    const title = document.getElementById('player-title').innerText;
    if (currentPlayingId) showAddToPlaylistMenu(currentPlayingId, title);
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Инициализация
updatePlaylistSelectors();
renderPlaylist();