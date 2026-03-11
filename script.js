const API_KEY = 'AIzaSyB780t5uL3VGWS-frrluarI_H-VMO7NoJA'; 
let player;
let myPlaylist = JSON.parse(localStorage.getItem('myPlaylist')) || [];
let currentTrackIndex = -1;
let currentPlayingId = '';

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-engine', {
        events: { 'onStateChange': onStateChange, 'onReady': startTick }
    });
}

function togglePanel(panelId) {
    const panels = ['side-search', 'side-playlist', 'side-themes'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (id === panelId) el.classList.toggle('active');
        else el.classList.remove('active');
    });
}

function setTheme(name) {
    document.body.className = 'theme-' + name;
    togglePanel(''); 
}

// Поиск
document.getElementById('search-btn').onclick = async () => {
    const q = document.getElementById('search-input').value;
    if(!q) return;
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${q}&type=video&key=${API_KEY}`);
        const data = await res.json();
        renderResults(data.items);
    } catch (e) { alert("Ошибка API"); }
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
            <div style="flex:1; font-size:13px; font-weight:bold">${title.slice(0,35)}</div>
            <button onclick="event.stopPropagation(); handlePlaylistToggle('${id}', '${title}')" 
                    style="background:var(--accent); border:none; border-radius:6px; padding:5px 10px; font-size:11px">
                ${myPlaylist.find(t => t.id === id) ? 'Убрать' : 'Добавить'}
            </button>
        `;
        div.onclick = () => { playMusic(id, title); togglePanel(''); };
        container.appendChild(div);
    });
}

// Умная функция добавления/удаления
function handlePlaylistToggle(id, title) {
    const index = myPlaylist.findIndex(t => t.id === id);
    if (index === -1) {
        myPlaylist.push({id, title});
    } else {
        myPlaylist.splice(index, 1);
        if (id === currentPlayingId) currentTrackIndex = -1;
    }
    saveAndRender();
    // Обновляем текст в результатах поиска, если они открыты
    const searchInput = document.getElementById('search-input').value;
    if(searchInput) document.getElementById('search-btn').click(); 
}

function saveAndRender() {
    localStorage.setItem('myPlaylist', JSON.stringify(myPlaylist));
    renderPlaylist();
    updateActionBtn();
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = myPlaylist.map((t, index) => 
        `<li>
            <span class="track-num">${index + 1}</span>
            <span onclick="playFromPlaylist(${index})" style="flex:1">${t.title.slice(0, 30)}...</span>
            <button class="remove-btn" onclick="event.stopPropagation(); handlePlaylistToggle('${t.id}', '')">&times;</button>
        </li>`
    ).join('');
}

// Плеер
function playMusic(id, title) {
    currentPlayingId = id;
    player.loadVideoById(id);
    document.getElementById('player-title').innerText = title;
    currentTrackIndex = myPlaylist.findIndex(t => t.id === id);
    updateActionBtn();
}

function updateActionBtn() {
    const btn = document.getElementById('toggle-playlist-btn');
    const isAdded = myPlaylist.find(t => t.id === currentPlayingId);
    btn.innerHTML = isAdded ? '<i class="fas fa-minus"></i>' : '<i class="fas fa-plus"></i>';
    btn.onclick = () => {
        const title = document.getElementById('player-title').innerText;
        handlePlaylistToggle(currentPlayingId, title);
    };
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
    player.seekTo((this.value / 100) * player.getDuration());
};

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
    if (event.data == 0) { 
        if(currentTrackIndex < myPlaylist.length - 1) playFromPlaylist(currentTrackIndex + 1); 
    }
}

document.getElementById('play-btn').onclick = () => {
    if(player.getPlayerState() == 1) player.pauseVideo();
    else player.playVideo();
};

document.getElementById('volume-slider').oninput = (e) => player.setVolume(e.target.value);
document.getElementById('next-btn').onclick = () => { if(currentTrackIndex < myPlaylist.length -1) playFromPlaylist(currentTrackIndex + 1); };
document.getElementById('prev-btn').onclick = () => { if(currentTrackIndex > 0) playFromPlaylist(currentTrackIndex - 1); };

renderPlaylist();