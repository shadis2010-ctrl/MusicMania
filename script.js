const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
// Структура: [{name: "Любимое", tracks: []}]
let library = JSON.parse(localStorage.getItem('mm_library')) || [{name: "Мой Плейлист", tracks: []}];
let activePlaylistIndex = 0;
let currentTrackIndexInPlaylist = -1;
let tempTrackToAdd = null; // Для модалки добавления

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
    
    title.innerText = "Мои Плейлисты";
    tools.style.display = "block";
    area.innerHTML = '';
    
    library.forEach((pl, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <i class="fas fa-music" style="color:var(--accent)"></i>
            <div style="flex:1" onclick="openPlaylist(${index})">
                <div style="font-weight:bold">${pl.name}</div>
                <div style="font-size:10px; opacity:0.6">${pl.tracks.length} треков</div>
            </div>
            <button onclick="deletePlaylist(${index})" style="background:none; border:none; color:#ff4757"><i class="fas fa-trash"></i></button>
        `;
        area.appendChild(div);
    });
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
    if (library.length <= 1) return alert("Нельзя удалить последний плейлист");
    if (confirm(`Удалить "${library[index].name}"?`)) {
        library.splice(index, 1);
        saveLibrary();
        showPlaylistManager();
    }
}

function openPlaylist(index) {
    activePlaylistIndex = index;
    const area = document.getElementById('playlist-content-area');
    const title = document.getElementById('playlist-view-title');
    const tools = document.getElementById('playlist-manager-tools');
    
    title.innerText = library[index].name;
    tools.style.display = "none";
    area.innerHTML = library[index].tracks.map((t, i) => `
        <div class="list-item">
            <div style="flex:1" onclick="playFromLibrary(${index}, ${i})">
                <div style="font-size:13px; font-weight:500">${t.title}</div>
            </div>
            <button onclick="removeFromPlaylist(${i})" style="background:none; border:none; color:#ff4757; font-size:18px">&times;</button>
        </div>
    `).join('') || '<p style="text-align:center; opacity:0.5">Тут пока пусто</p>';
}

function closePlaylistView() {
    const tools = document.getElementById('playlist-manager-tools');
    if (tools.style.display === "none") showPlaylistManager(); // Если внутри плейлиста - выходим в список
    else togglePanel(''); // Если в списке - закрываем панель
}

// --- ПОИСК И ДОБАВЛЕНИЕ ---

document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    renderSearchResults(data.items);
};

function renderSearchResults(items) {
    const container = document.getElementById('search-results');
    container.innerHTML = items.map(item => {
        const id = item.id.videoId;
        const title = item.snippet.title.replace(/'/g, "");
        return `
            <div class="list-item">
                <img src="${item.snippet.thumbnails.default.url}" style="width:45px; border-radius:8px">
                <div style="flex:1; font-size:12px; font-weight:bold" onclick="playInstant('${id}', '${title}')">${title.slice(0,35)}</div>
                <button onclick="openAddModal('${id}', '${title}')" style="background:var(--accent); border:none; border-radius:8px; padding:8px"><i class="fas fa-plus"></i></button>
            </div>
        `;
    }).join('');
}

function openAddModal(id, title) {
    tempTrackToAdd = { id, title };
    const list = document.getElementById('target-playlist-list');
    list.innerHTML = library.map((pl, i) => `
        <div onclick="addTrackToPlaylist(${i})" style="padding:15px; border-bottom:1px solid rgba(255,255,255,0.1); font-size:14px">
            <i class="fas fa-folder" style="margin-right:10px"></i> ${pl.name}
        </div>
    `).join('');
    document.getElementById('add-to-modal').style.display = 'flex';
}

function addTrackToPlaylist(plIndex) {
    library[plIndex].tracks.push(tempTrackToAdd);
    saveLibrary();
    closeModal();
    alert("Добавлено в " + library[plIndex].name);
}

function closeModal() { document.getElementById('add-to-modal').style.display = 'none'; }
function removeFromPlaylist(trackIdx) {
    library[activePlaylistIndex].tracks.splice(trackIdx, 1);
    saveLibrary();
    openPlaylist(activePlaylistIndex);
}

// --- ПЛЕЕР ---

function playInstant(id, title) {
    player.loadVideoById(id);
    document.getElementById('player-title').innerText = title;
    document.getElementById('current-playlist-name').innerText = "Вне плейлиста";
    currentTrackIndexInPlaylist = -1;
    togglePanel('');
}

function playFromLibrary(plIdx, trackIdx) {
    activePlaylistIndex = plIdx;
    currentTrackIndexInPlaylist = trackIdx;
    const track = library[plIdx].tracks[trackIdx];
    player.loadVideoById(track.id);
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('current-playlist-name').innerText = "Плейлист: " + library[plIdx].name;
    togglePanel('');
}

function saveLibrary() { localStorage.setItem('mm_library', JSON.stringify(library)); }

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

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const glow = document.getElementById('vinyl-glow');
    if (event.data == 1) { disk.style.animationPlayState = 'running'; glow.classList.add('playing'); }
    else { disk.style.animationPlayState = 'paused'; glow.classList.remove('playing'); }
    
    // Автопереключение в плейлисте
    if (event.data == 0 && currentTrackIndexInPlaylist !== -1) {
        if (currentTrackIndexInPlaylist < library[activePlaylistIndex].tracks.length - 1) {
            playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist + 1);
        }
    }
}

document.getElementById('play-btn').onclick = () => player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo();
document.getElementById('next-btn').onclick = () => {
    if (currentTrackIndexInPlaylist < library[activePlaylistIndex].tracks.length - 1) playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist + 1);
};
document.getElementById('prev-btn').onclick = () => {
    if (currentTrackIndexInPlaylist > 0) playFromLibrary(activePlaylistIndex, currentTrackIndexInPlaylist - 1);
};

function formatTime(s) { return Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,'0'); }
function setTheme(n) { document.body.className = 'theme-'+n; togglePanel(''); }