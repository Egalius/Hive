// ========== Firebase Setup ==========
const firebaseConfig = {
  apiKey: "AIzaSyAog5ZF6Ybbsm3LrtbNxumLfY5u2DPjhOg",
  authDomain: "hive-b6642.firebaseapp.com",
  databaseURL: "https://hive-b6642-default-rtdb.firebaseio.com",
  projectId: "hive-b6642",
  storageBucket: "hive-b6642.firebasestorage.app",
  messagingSenderId: "492113374362",
  appId: "1:492113374362:web:be5de9d5e106bf49a28323",
  measurementId: "G-KJPVCC034M"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ========== Section Toggle ==========
document.querySelectorAll('.nav-btn').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.section;
    
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(targetId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

// ========== AniList Recommendations ==========
async function fetchRecommendations() {
  const query = `
    query {
      Page(perPage: 6) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          coverImage { large }
          description(asHtml: false)
          episodes
          genres
          averageScore
          siteUrl
        }
      }
    }
  `;
  
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    renderRecommendations(result.data.Page.media);
  } catch (err) {
    console.error('AniList error:', err);
    document.getElementById('recommendation').innerHTML = '<p>Failed to load recommendations.</p>';
  }
}

function renderRecommendations(mediaList) {
  const container = document.getElementById('recommendation');
  container.innerHTML = '';
  
  mediaList.forEach(item => {
    const title = item.title.english || item.title.romaji;
    const genres = item.genres.join(', ');
    const desc = item.description?.slice(0, 120).replace(/<\/?[^>]+(>|$)/g, "") + '...' || 'No description';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${item.coverImage.large}" alt="${title}" />
      <h3>${title}</h3>
      <p><em>${genres}</em></p>
      <p>${desc}</p>
      <p>Episodes: ${item.episodes || 'N/A'} | Score: ${item.averageScore || 'N/A'}</p>
      <a href="${item.siteUrl}" target="_blank" rel="noopener">More Info</a>
    `;
    container.appendChild(card);
  });
}

// ========== Form Submission ==========
const form = document.getElementById('entryForm');
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const type = document.getElementById('type').value;
  const progress = document.getElementById('progress').value.trim();
  
  if (title && progress) {
    saveProgress(title, type, progress);
    form.reset();
  }
});

function saveProgress(title, type, progress) {
  const ref = database.ref('progress');
  
  ref.once('value', snap => {
    const data = snap.val() || {};
    let foundKey = null;
    
    for (const key in data) {
      if (data[key].title.toLowerCase() === title.toLowerCase()) {
        foundKey = key;
        break;
      }
    }
    
    if (foundKey) {
      const history = data[foundKey].history || [];
      if (!history.includes(progress)) history.push(progress);
      
      ref.child(foundKey).update({ history, timestamp: Date.now() });
    } else {
      ref.push({ title, type, history: [progress], timestamp: Date.now() });
    }
  });
}

// ========== Render User Progress ==========
database.ref('progress').on('value', snap => {
  const data = snap.val();
  renderProgressList(data);
});

function renderProgressList(data) {
  const container = document.getElementById('progressList');
  container.innerHTML = '';
  
  if (!data) {
    container.innerHTML = '<p>No progress yet.</p>';
    return;
  }
  
  Object.entries(data).forEach(([key, entry]) => {
    const card = document.createElement('div');
    card.className = 'progress-card';
    
    const historyHTML = entry.history.map(p => `<li>${p}</li>`).join('');
    card.innerHTML = `
      <h3>${entry.title} <span class="badge">${entry.type}</span></h3>
      <ul class="history-list">${historyHTML}</ul>
      <button class="delete-btn" data-key="${key}">Delete</button>
    `;
    
    container.appendChild(card);
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const key = e.target.dataset.key;
      deleteProgress(key);
    });
  });
}

function deleteProgress(key) {
  database.ref('progress').child(key).remove()
    .then(() => console.log('Deleted:', key))
    .catch(err => console.error('Delete error:', err));
}

// ========== Start ==========
document.addEventListener('DOMContentLoaded', fetchRecommendations);