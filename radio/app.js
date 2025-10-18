// Elements
const albumCoverEl = document.getElementById('album-cover');
const playBtn = document.getElementById('play-btn');
const currentTrackEl = document.getElementById('song-title'); // or create a new element with id="current-track"
const progressFillEl = document.getElementById('playlist-progress');
const timerEl = document.getElementById('playlist-timer');
const weatherEl = document.getElementById('weather');
const upcomingSongsList = document.getElementById('upcoming-songs-list');


// Audio players
const playlistPlayer = new Audio();
const radioPlayer = new Audio();
radioPlayer.src = "https://edge.iono.fm/xice/ecr_live_high.aac";
radioPlayer.type = "audio/aac";
radioPlayer.crossOrigin = "anonymous";
// East Coast Radio

let playlist = [];
let currentSongIndex = 0;
let isPlaying = false;
let timerInterval = null;
let currentMode = "playlist";

// ----- Greeting -----
function setGreeting() {
  const greetingEl = document.getElementById("greeting");
  const now = new Date();
  const hours = now.getHours();
  let greeting = "Good Morning";
  if (hours >= 12 && hours < 18) greeting = "Good Afternoon";
  else if (hours >= 18) greeting = "Good Evening";
  greetingEl.textContent = greeting;
}
setGreeting();
setInterval(setGreeting, 1000);

// ----- Weather (OpenWeather) -----
async function fetchWeatherForecast() {
  const apiKey = "a1465b9cf29f2e1c9741c98993c0bf1d";
  const city = "Durban";
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&cnt=24&appid=${apiKey}`);
  const data = await res.json();
  
  const forecasts = data.list.slice(0, 3).map(f => ({
    temp: Math.round(f.main.temp),
    desc: f.weather[0].main,
    date: new Date(f.dt_txt).toLocaleDateString("en-ZA", { weekday: "short" })
  }));

  document.getElementById('weather').innerHTML = forecasts
    .map(f => `${f.date}: ${f.desc}, ${f.temp}°C`)
    .join('<br>');
}
fetchWeatherForecast();
setInterval(fetchWeatherForecast, 30 * 60 * 1000);


// ----- Playlist fetch/load -----
async function fetchPlaylist() {
  try {
    const res = await fetch("/playlist");
    if (!res.ok) throw new Error("Failed to fetch playlist");
    playlist = await res.json();
    playlist = playlist.map((s) => ({
      file: s.file || "unknown.mp3",
      requester: s.requester || "Anonymous",
      reason: s.reason || "",
      cover: s.cover || "album.jpg",
    }));
    loadUpcomingSongs();
  } catch (err) {
    console.error("Playlist fetch error:", err);
    upcomingSongsList.innerHTML = "<li>Could not load playlist</li>";
    playlist = [];
  }
}
fetchPlaylist();

async function fetchQuote() {
  const res = await fetch("https://api.quotable.io/random");
  const data = await res.json();
  document.getElementById("fact").textContent = `"${data.content}" — ${data.author}`;
}
fetchQuote();
setInterval(fetchQuote, 60 * 60 * 1000);


async function fetchNews() {
  const res = await fetch(`https://newsdata.io/api/1/news?apikey=pub_XXXXX&country=za&language=en`);
  const data = await res.json();
  const headlines = data.results.slice(0, 3)
    .map(a => `<li>${a.title}</li>`)
    .join('');
  document.getElementById("news-list").innerHTML = headlines;
}

// ----- Upcoming songs -----
function loadUpcomingSongs() {
  upcomingSongsList.innerHTML = "";
  playlist.forEach((song, index) => {
    const li = document.createElement("li");
    li.textContent = `${song.file} — ${song.requester}`;
    if (index === currentSongIndex) li.style.fontWeight = "bold";
    upcomingSongsList.appendChild(li);
  });
}
async function fetchNowPlaying() {
  try {
    const res = await fetch("https://api.allorigins.win/raw?url=https://stream.iono.fm/xice/ecr_live_medium.aac");
    const data = await res.json();
    const current = data[0]?.now_playing;
    if (current) {
      document.getElementById('song-title').textContent = `${current.artist} — ${current.title}`;
      document.getElementById('album-cover').src = current.cover || 'radio-logo.png';
    }
  } catch (e) {
    console.error('Now playing fetch error:', e);
  }
}
setInterval(fetchNowPlaying, 10000);

// ----- Load playlist song -----
function loadNextPlaylistSong() {
  if (!playlist.length) return;
  const song = playlist[currentSongIndex];
  playlistPlayer.src = `/songs/${encodeURIComponent(song.file)}`;
  albumCoverEl.src = song.cover;
  currentTrackEl.textContent = song.file;
  playlistPlayer.play().catch(() => console.log("User interaction needed"));
  isPlaying = true;
  playBtn.textContent = "⏸";
  currentSongIndex = (currentSongIndex + 1) % playlist.length;
  loadUpcomingSongs();
}

playlistPlayer.addEventListener("ended", loadNextPlaylistSong);

// Play/pause button
playBtn.addEventListener("click", () => {
  if (isPlaying) {
    if (currentMode === "playlist") playlistPlayer.pause();
    else radioPlayer.pause();
    playBtn.textContent = "▶";
    isPlaying = false;
  } else {
    if (currentMode === "playlist") {
      if (!playlistPlayer.src) loadNextPlaylistSong();
      playlistPlayer.play();
    } else {
      radioPlayer.play();
    }
    playBtn.textContent = "⏸";
    isPlaying = true;
  }
});

// ----- Timer & progress -----
function startTimer(minutes, onFinish) {
  clearInterval(timerInterval);
  
  const totalSeconds = minutes * 60;
  const startTime = Date.now();

  function update() {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const percent = Math.min(100, (elapsed / totalSeconds) * 100);
    progressFillEl.style.width = `${percent}%`;

    const remainingSeconds = Math.max(0, totalSeconds - elapsed);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    timerEl.textContent = `${mins}m ${secs}s`;

    if (remainingSeconds > 0) {
      timerInterval = requestAnimationFrame(update);
    } else {
      onFinish();
    }
  }

  update();
}



// ----- Mode switching -----
function switchToPlaylist() {
  currentMode = "playlist";
  radioPlayer.pause();
  loadNextPlaylistSong();
  startTimer(0.1, switchToRadio); // 3 minutes for testing
}

function switchToRadio() {
  currentMode = "radio";
  playlistPlayer.pause();
  radioPlayer.play().catch(() => console.log("Radio playback blocked"));
  albumCoverEl.src = "https://via.placeholder.com/250x250.png?text=Radio";
  currentTrackEl.textContent = "East Coast Radio Live";
  startTimer(10, switchToPlaylist);
}

// ----- Init -----
async function init() {
  await fetchPlaylist();
  switchToPlaylist();
}
init();

window.addEventListener("click", () => {
  radioPlayer.play().catch(err => console.log("Autoplay blocked:", err));
}, { once: true });

