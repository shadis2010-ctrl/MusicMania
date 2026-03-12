const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
let myPlaylist = JSON.parse(localStorage.getItem('myPlaylist')) || [];
let currentTrackIndex = -1;
let currentPlayingId = '';

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        playerVars: { 'playsinline': 1 },
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

// Media Session для работы кнопок на заблокированном экране
function updateMediaMetadata(title) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'MusicMania',
            artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => player.playVideo());
        navigator.mediaSession.setActionHandler('pause', () => player.pauseVideo());
        navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('prev-btn').click());
        navigator.mediaSession.setActionHandler('nexttrack', () => document.getElementById('next-btn').click());
    }
}

function playMusic(id, title) {
    currentPlayingId = id;
    
    // Активируем тишину для фона
    const silentAudio = document.getElementById('silent-audio');
    silentAudio.play().catch(() => {});

    if (player && player.loadVideoById) {
        player.loadVideoById(id);
        document.getElementById('player-title').innerText = title;
        currentTrackIndex = myPlaylist.findIndex(t => t.id === id);
        updateActionBtn();
        updateMediaMetadata(title);
    }
}

function togglePanel(panelId) {
    const panels = ['side-search', 'side-playlist', 'side-themes'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) id === panelId ? el.classList.toggle('active') : el.classList.remove('active');
    });
}

function setTheme(name) {
    document.body.className = 'theme-' + name;
    togglePanel(''); 
}

document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
        const data = await res.json();
        renderResults(data.items);
    } catch (e) { alert("Ошибка сети"); }
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
            <button onclick="event.stopPropagation(); handlePlaylistToggle('${id}', '${title}')" 
                    style="background:var(--accent); border:none; border-radius:6px; padding:6px; font-size:10px; font-weight:bold">
                ${myPlaylist.find(t => t.id === id) ? 'Убрать' : 'Добавить'}
            </button>
        `;
        div.onclick = () => { playMusic(id, title); togglePanel(''); };
        container.appendChild(div);
    });
}

function handlePlaylistToggle(id, title) {
    const index = myPlaylist.findIndex(t => t.id === id);
    index === -1 ? myPlaylist.push({id, title}) : myPlaylist.splice(index, 1);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('myPlaylist', JSON.stringify(myPlaylist));
    renderPlaylist();
    updateActionBtn();
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    container.innerHTML = myPlaylist.map((t, index) => 
        `<li>
            <span style="color:var(--accent); font-weight:bold; margin-right:10px">${index + 1}</span>
            <span onclick="playFromPlaylist(${index})" style="flex:1">${t.title.slice(0, 30)}...</span>
            <button onclick="event.stopPropagation(); handlePlaylistToggle('${t.id}', '')" 
                    style="background:none; border:none; color:#ff4757; font-size:20px">&times;</button>
        </li>`
    ).join('');
}

function updateActionBtn() {
    const btn = document.getElementById('toggle-playlist-btn');
    const isAdded = myPlaylist.find(t => t.id === currentPlayingId);
    if(btn) btn.innerHTML = isAdded ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';
    if(btn) btn.onclick = () => handlePlaylistToggle(currentPlayingId, document.getElementById('player-title').innerText);
}

function playFromPlaylist(index) {
    if (index >= 0 && index < myPlaylist.length) {
        currentTrackIndex = index;
        playMusic(myPlaylist[index].id, myPlaylist[index].title);
        togglePanel('');
    }
}

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
    if (player && player.seekTo) player.seekTo((this.value / 100) * player.getDuration());
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const btn = document.getElementById('play-btn');
    if (event.data == 1) { disk.style.animationPlayState = 'running'; btn.innerHTML = '<i class="fas fa-pause-circle"></i>'; }
    else { disk.style.animationPlayState = 'paused'; btn.innerHTML = '<i class="fas fa-play-circle"></i>'; }
    if (event.data == 0 && currentTrackIndex < myPlaylist.length - 1) playFromPlaylist(currentTrackIndex + 1);
}

document.getElementById('play-btn').onclick = () => {
    player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo();
};

document.getElementById('next-btn').onclick = () => { if(currentTrackIndex < myPlaylist.length -1) playFromPlaylist(currentTrackIndex + 1); };
document.getElementById('prev-btn').onclick = () => { if(currentTrackIndex > 0) playFromPlaylist(currentTrackIndex - 1); };

renderPlaylist();