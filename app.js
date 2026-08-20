// আপনার GitHub ইউজারনেম এবং রিপোজিটরি নাম দিন
const GITHUB_USERNAME = "konaiparimal50"; // <-- পরিবর্তন করুন
const GITHUB_REPO = "Github-api-test";      // <-- পরিবর্তন করুন

// GitHub Raw URL (সরাসরি ডেটাবেস হিসেবে ব্যবহার হবে)
const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/data/news.json`;

const newsGrid = document.getElementById('newsGrid');
const errorMessage = document.getElementById('errorMessage');
const emptyMessage = document.getElementById('emptyMessage');
const heroContainer = document.getElementById('heroContainer');
const secondaryContainer = document.getElementById('secondaryContainer');

let allNewsData = [];
let currentIndex = 0;
const PAGE_SIZE = 10;
let isLoading = false;
let isFirstBatch = true;

const CATEGORY_COLORS = {
  'জাতীয়': '#b71c1c',
  'আন্তর্জাতিক': '#1e4d8f',
  'রাজনীতি': '#6b21a8',
  'শিক্ষা': '#0f766e',
  'খেলা': '#15803d',
  'বিনোদন': '#be185d'
};
const DEFAULT_CATEGORY_COLOR = '#b45309';

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

function categoryBadgeHTML(category) {
  if (!category) return '';
  const safeCategory = escapeHTML(category);
  return `<span class="category-badge" style="background-color:${getCategoryColor(category)}">${safeCategory}</span>`;
}

function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "তারিখ পাওয়া যায়নি"; 
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; 
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('bn-BD', options); 
  } catch (error) {
    return dateString;
  }
}

function getCardData(item, excerptLength = 100) {
  const imageUrl = item.image || 'https://via.placeholder.com/400x250?text=No+Image';
  const headline = escapeHTML(item.headline || 'শিরোনাম নেই');
  const shortBody = escapeHTML(truncateText(item.body, excerptLength));
  const editorName = escapeHTML(item.editor || 'P.K EDITOR');
  const newsDate = formatDate(item.date || item.createdAt);
  const itemId = item.id;
  const badge = categoryBadgeHTML(item.category);
  return { imageUrl, headline, shortBody, editorName, newsDate, itemId, badge };
}

function renderHero(item) {
  if (!heroContainer) return;
  if (!item) { heroContainer.innerHTML = ''; return; }

  const { imageUrl, headline, shortBody, editorName, newsDate, itemId, badge } = getCardData(item, 140);

  heroContainer.innerHTML = `
    <article class="hero-card">
      <a href="details/details.html?id=${itemId}" class="hero-link">
        <div class="hero-media">
          <img src="${imageUrl}" alt="${headline}" loading="eager">
          <div class="hero-gradient"></div>
          ${badge}
        </div>
        <div class="hero-content">
          <span class="hero-eyebrow">শীর্ষ খবর</span>
          <h2 class="hero-headline">${headline}</h2>
          <p class="hero-excerpt">${shortBody}</p>
          <div class="hero-meta">
            <span class="editor-name"><i class="fas fa-user-edit"></i> ${editorName}</span>
            <span class="publish-date"><i class="far fa-clock"></i> ${newsDate}</span>
          </div>
        </div>
      </a>
    </article>`;
}

function renderSecondary(items) {
  if (!secondaryContainer) return;
  if (!items || !items.length) { secondaryContainer.innerHTML = ''; return; }

  secondaryContainer.innerHTML = items.map(item => {
    const { imageUrl, headline, editorName, newsDate, itemId } = getCardData(item, 70);
    return `
      <article class="secondary-card">
        <a href="details/details.html?id=${itemId}" class="secondary-link">
          <div class="secondary-media">
            <img src="${imageUrl}" alt="${headline}" loading="lazy">
          </div>
          <div class="secondary-content">
            <h3>${headline}</h3>
            <div class="secondary-meta">
              <span>${editorName}</span>
              <span>${newsDate}</span>
            </div>
          </div>
        </a>
      </article>`;
  }).join('');
}

function appendNews(newsList) {
  newsList.forEach(item => {
    const { imageUrl, headline, shortBody, editorName, newsDate, itemId, badge } = getCardData(item, 100);

    const card = document.createElement('article');
    card.className = 'news-card';

    card.innerHTML = `
      <a href="details/details.html?id=${itemId}" class="card-link">
        <div class="card-media">
          <img src="${imageUrl}" alt="${headline}" loading="lazy">
          ${badge}
        </div>
        <div class="card-content">
          <div class="card-meta">
            <span class="editor-name"><i class="fas fa-user-edit"></i> ${editorName}</span>
            <span class="publish-date"><i class="far fa-clock"></i> ${newsDate}</span>
          </div>
          <h3>${headline}</h3>
          <p>${shortBody}</p>
          <span class="read-more">বিস্তারিত পড়ুন →</span>
        </div>
      </a>
    `;
    newsGrid.appendChild(card);
  });
}

// মূল ডেটা ফেচ ফাংশন
async function fetchNews() {
  if (isLoading) return;

  try {
    isLoading = true;
    errorMessage.style.display = 'none';

    // প্রথমবার ডেটা ফেচ
    if (allNewsData.length === 0) {
      // ক্যাশ প্রতিরোধ করতে টাইমস্ট্যাম্প যোগ করা হলো
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error("JSON ডেটা পাওয়া যায়নি");
      allNewsData = await response.json();
    }

    if (!Array.isArray(allNewsData) || allNewsData.length === 0) {
      emptyMessage.style.display = 'block';
      isLoading = false;
      return;
    }

    if (isFirstBatch) {
      isFirstBatch = false;
      const heroItem = allNewsData[0];
      const secondaryItems = allNewsData.slice(1, 4);
      const gridItems = allNewsData.slice(4, 4 + PAGE_SIZE);

      renderHero(heroItem);
      renderSecondary(secondaryItems);
      if (gridItems.length) appendNews(gridItems);
      currentIndex = 4 + gridItems.length;
    } else {
      if (currentIndex < allNewsData.length) {
        const nextBatch = allNewsData.slice(currentIndex, currentIndex + PAGE_SIZE);
        appendNews(nextBatch);
        currentIndex += nextBatch.length;
      }
    }

    // ব্রেকিং নিউজ টিকার আপডেট
    updateTicker(allNewsData.slice(0, 3));

    isLoading = false;
  } catch (error) {
    console.error('Error:', error);
    errorMessage.style.display = 'block';
    isLoading = false;
  }
}

function updateTicker(recentNews) {
  const tickerMove = document.querySelector('.ticker-move');
  if (!tickerMove || !recentNews.length) return;

  let tickerHTML = '';
  const prefixes = ["সবচেয়ে বড় খবর: ", "এই মুহূর্তের আপডেট: ", "টাটকা খবর: "];

  recentNews.forEach((news, index) => {
    const prefix = prefixes[index] || "খবর: ";
    const headline = news.headline || 'শিরোনাম নেই';
    tickerHTML += `<span class="ticker-item">${prefix} ${headline}</span>`;
  });
  tickerHTML += `<span class="ticker-item">আরও নতুন খবর পেতে আমাদের সাথেই থাকুন...</span>`;
  tickerMove.innerHTML = tickerHTML;
}

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 250) {
    if (currentIndex < allNewsData.length) {
      fetchNews();
    }
  }
});

// মেনু ও সাইডবার লজিক
const menuBtn = document.getElementById('menuBtn');
const closeBtn = document.getElementById('closeBtn');
const sidebarMenu = document.getElementById('sidebarMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (menuBtn && closeBtn && sidebarMenu && sidebarOverlay) {
  menuBtn.addEventListener('click', () => {
    sidebarMenu.classList.add('active');
    sidebarOverlay.classList.add('active');
  });
  closeBtn.addEventListener('click', () => {
    sidebarMenu.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });
  sidebarOverlay.addEventListener('click', () => {
    sidebarMenu.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });
}

function setupSidebarSubmenu(toggleId, submenuId) {
  const toggle = document.getElementById(toggleId);
  const submenu = document.getElementById(submenuId);
  if (!toggle || !submenu) return;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = submenu.style.display === 'block';
    submenu.style.display = isOpen ? 'none' : 'block';
    const icon = toggle.querySelector('.dropdown-icon');
    if (icon) {
      icon.classList.toggle('fa-chevron-down', isOpen);
      icon.classList.toggle('fa-chevron-up', !isOpen);
    }
  });
}
setupSidebarSubmenu('districtToggle', 'districtSubmenu');
setupSidebarSubmenu('editorToggle', 'editorSubmenu');

document.addEventListener('DOMContentLoaded', fetchNews);
