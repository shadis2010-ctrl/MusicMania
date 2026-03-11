const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
let myPlaylist = JSON.parse(localStorage.getItem('myPlaylist')) || [];
let currentTrackIndex = -1;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        playerVars: { 'playsinline': 1, 'controls': 0 },
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

// Media Session - Ключ к фоновому режиму
function initMediaSession(title) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: 'MusicMania',
            artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png', sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => player.playVideo());
        navigator.mediaSession.setActionHandler('pause', () => player.pauseVideo());
        navigator.mediaSession.setActionHandler('nexttrack', () => document.getElementById('next-btn').click());
        navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('prev-btn').click());
    }
}

function playMusic(id, title) {
    // 1. Пытаемся запустить тихий аудио-файл
    const silentAudio = document.getElementById('silent-audio');
    silentAudio.play().catch(e => console.log("Фоновый звук ждет клика"));

    // 2. Запускаем видео
    if (player && player.loadVideoById) {
        player.loadVideoById(id);
        document.getElementById('player-title').innerText = title;
        currentTrackIndex = myPlaylist.findIndex(t => t.id === id);
        initMediaSession(title);
    }
}

function onStateChange(event) {
    const disk = document.getElementById('vinyl-disk');
    const btn = document.getElementById('play-btn');
    if (event.data == 1) { 
        disk.style.animationPlayState = 'running'; 
        btn.innerHTML = '<i class="fas fa-pause-circle"></i>';
    } else { 
        disk.style.animationPlayState = 'paused'; 
        btn.innerHTML = '<i class="fas fa-play-circle"></i>'; 
    }
    // Автовоспроизведение следующего
    if (event.data == 0 && currentTrackIndex < myPlaylist.length - 1) {
        playFromPlaylist(currentTrackIndex + 1);
    }
}

// Вспомогательные функции
document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
    const data = await res.json();
    renderResults(data.items);
};

function renderResults(items) {
    const container = document.getElementById('search-results');
    container.innerHTML = items.map(item => `
        <div class="search-item" onclick="playMusic('${item.id.videoId}', '${item.snippet.title.replace(/'/g, "")}')">
            <img src="${item.snippet.thumbnails.default.url}" style="width:40px">
            <div style="flex:1; font-size:12px">${item.snippet.title.slice(0,30)}</div>
        </div>
    `).join('');
}

function playFromPlaylist(index) {
    if (index >= 0 && index < myPlaylist.length) {
        currentTrackIndex = index;
        playMusic(myPlaylist[index].id, myPlaylist[index].title);
    }
}

function togglePanel(id) {
    document.getElementById(id).classList.toggle('active');
}

function startTick() {
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const current = player.getCurrentTime();
            document.getElementById('current-time').innerText = formatTime(current);
        }
    }, 1000);
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

document.getElementById('play-btn').onclick = () => {
    player.getPlayerState() == 1 ? player.pauseVideo() : player.playVideo();
};

function setTheme(name) { document.body.className = 'theme-' + name; }