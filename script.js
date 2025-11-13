// Elements
const container = document.querySelector(".gallery-container");
const rooms = document.querySelectorAll(".gallery-room");
const frames = document.querySelectorAll(".frame");

const popup = document.getElementById("infoPopup");
const artTitle = document.getElementById("artTitle");
const artArtist = document.getElementById("artArtist");
const closePopup = document.getElementById("closePopup");

const forwardBtn = document.getElementById("forwardBtn");
const backwardBtn = document.getElementById("backwardBtn");
const addBtn = document.querySelector(".fa-circle-plus");

const formContainer = document.getElementById("artControls")
const addForm = document.getElementById("addArtForm");
const fileInput = document.getElementById("artImageInput");
const titleInput = document.getElementById("artTitleInput");
const artistInput = document.getElementById("artArtistInput");
const categorySelect = document.getElementById("artCategory");

// Initialize
let currentRoom = 0;

// Function to update rooms
function showRoom(index) {
  if (index < 0 || index >= rooms.length) return;
  currentRoom = index;

    // remove active from all first (deterministic)
  rooms.forEach(room => {
    room.classList.remove('active');
  });

  // add active to the desired room
  const active = rooms[currentRoom];
  active.classList.add('active');

  rooms.forEach((room, i) => {
    if (i < currentRoom) {
      // Rooms behind the current room (zoomed out)
      room.style.transform = "scale(0.7)";
      room.style.opacity = "0.5";
      room.style.zIndex = 0;
    } else if (i === currentRoom) {
      // Current active room (zoomed in)
      room.style.transform = "scale(1)";
      room.style.opacity = "1";
      room.style.zIndex = 10;
    } else {
      // Rooms ahead of current room (hidden behind)
      room.style.transform = "scale(0.7)";
      room.style.opacity = "0.5";
      room.style.zIndex = 0;
    }
  });
}

// Initialize first room
showRoom(currentRoom);

// Button events
forwardBtn.addEventListener("click", () => showRoom(currentRoom + 1));
backwardBtn.addEventListener("click", () => showRoom(currentRoom - 1));

// plus icon (or the <a> wraps it)
document.addEventListener('click', (e) => {
  const plus = e.target.closest('.fa-circle-plus, .open-add-btn'); // add your selectors
  if (!plus) return;

  // open overlay
  artControls.classList.add('overlay');
  // prevent default anchor behavior if wrapped in <a>
  if (plus.tagName === 'A' || plus.closest('a')) e.preventDefault?.();
});

// ===== Artwork Popups =====
document.addEventListener("click", (e) => {
  const frame = e.target.closest(".frame");

  // When clicking a frame (not delete button or popup)
  if (frame && !e.target.classList.contains("delete-btn") && !e.target.closest(".popup")) {
    const popup = frame.querySelector(".popup");
    popup.classList.toggle("hidden"); // toggle show/hide

    // Close any other open popups
    document.querySelectorAll(".popup").forEach(p => {
      if (p !== popup) p.classList.add("hidden");
    });
  }

  // Close popup when clicking the ×
  if (e.target.classList.contains("closePopup")) {
    e.target.closest(".popup").classList.add("hidden");
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".popup") && !e.target.closest(".frame")) {
    popup.classList.add("hidden");
  }
});

// ===== LocalStorage Handling =====
function getStoredArtworks() {
  return JSON.parse(localStorage.getItem("artworks")) || [];
}

function saveArtworks(data) {
  localStorage.setItem("artworks", JSON.stringify(data));
}

// ---- resizeImage (robust, integer math + logs) ----
async function resizeImage(file, maxW = 800, maxH = 700, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // scale proportionally
        if (w > maxW || h > maxH) {
          const scale = Math.min(maxW / w, maxH / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        console.log("[resizeImage] scaled:", w, "x", h);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


// ---- renderArtworks with image onload logs to verify natural sizes ----
function renderArtworks() {
  const all = getStoredArtworks();

  // smoother re-render
  rooms.forEach(room => room.querySelector('.artworks').classList.remove('ready'));

  if (all.length >= 1) {
    rooms.forEach(room => room.querySelector('.artworks').innerHTML = '');
  }

  rooms.forEach(room => {
    room.querySelectorAll(".frame[data-user='true']").forEach(el => el.remove());
  });

  all.forEach(item => {
    const room = document.getElementById(item.category);
    if (!room) return;

    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.dataset.user = 'true';

    const imgEl = document.createElement('img');
    imgEl.className = 'frame-img';
    imgEl.src = item.image;
    imgEl.alt = item.title || '';
    imgEl.width = 800;
    imgEl.height = 400;
    frame.dataset.title = item.title;
    frame.dataset.artist = item.artist;

    // Create popup container for this specific frame
    const popup = document.createElement('div');
    popup.className = 'popup hidden';
    popup.innerHTML = `
      <span class="closePopup">&times;</span>
      <h3 class="artTitle">${item.title || 'Untitled'}</h3>
      <p class="artArtist">${item.artist ? 'Artist: ' + item.artist : 'Unknown artist'}</p>
    `;

    // Append popup to the frame
    frame.appendChild(popup);

    // Log actual natural size when image finishes loading in DOM
    imgEl.onload = function() {
      console.log('[renderArtworks] img loaded natural size:', imgEl.naturalWidth, 'x', imgEl.naturalHeight, 'isData:', imgEl.src.startsWith('data:'));
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '🗑️';
    delBtn.dataset.id = item.id;

    frame.appendChild(imgEl);
    frame.appendChild(delBtn);
    room.querySelector('.artworks').appendChild(frame);
  });

  setTimeout(() => {
    rooms.forEach(room => room.querySelector('.artworks').classList.add('ready'));
  }, 50);
}

// ===== Overlay toggles =====
document.querySelectorAll('.fa-circle-plus').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    formContainer.classList.add('overlay'); // use your correct variable
  });
});

artControls.addEventListener("click", (e) => {
  if (e.target === artControls) {
    artControls.classList.remove("overlay");
  }
});

// ---- addForm submit handler using resizeImage ----
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return alert('Please select an image.');
  if (file.size > 5 * 1024 * 1024) return alert('⚠️ File too large! Maximum 5 MB allowed.');

  try {
    // resize/crop/compress to exact 300x350
    const resizedData = await resizeImage(file, 800, 700, 0.8);
    console.log('[addForm] resizedData length:', resizedData.length);
    // create object and save
    const newArt = {
      id: Date.now(),
      title: titleInput.value.trim(),
      artist: artistInput.value.trim(),
      category: categorySelect.value,
      image: resizedData
    };

    const all = getStoredArtworks();
    all.push(newArt);
    saveArtworks(all);

    // re-render and close overlay
    rooms.forEach(room => room.querySelector('.artworks').innerHTML = '');
    renderArtworks();

    addForm.reset();
    artControls.classList.remove('overlay');
  } catch (err) {
    console.error('[addForm] resize/save failed:', err);
    alert('Image processing failed — try another image.');
  }
});

// ===== Delete Artwork =====
document.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    let all = getStoredArtworks();
    all = all.filter(item => item.id != id);
    saveArtworks(all);
    renderArtworks();
  }
});

// ===== Init on Load =====
renderArtworks();

// ===== Background Music Toggle =====
let musicPlaying = false;

// Ensure the audio element loops
bgMusic.loop = true;
bgMusic.volume = 0.5; // comfortable volume

// Try autoplay when the page loads
window.addEventListener("load", () => {
  const playPromise = bgMusic.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        musicPlaying = true;
        musicBtn.textContent = "🔊";
      })
      .catch(() => {
        // Autoplay blocked — wait for first click or scroll
        const startMusic = () => {
          if (!musicPlaying) {
            bgMusic.play();
            musicPlaying = true;
            musicBtn.textContent = "🔊";
          }
          document.removeEventListener("click", startMusic);
          document.removeEventListener("scroll", startMusic);
        };
        document.addEventListener("click", startMusic);
        document.addEventListener("scroll", startMusic);
      });
  }
});

// Manual toggle
musicBtn.addEventListener("click", () => {
  if (!musicPlaying) {
    bgMusic.play();
    musicBtn.textContent = "🔊";
  } else {
    bgMusic.pause();
    musicBtn.textContent = "🔈";
  }
  musicPlaying = !musicPlaying;
});