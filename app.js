// app.js[span_0](start_span)[span_0](end_span)

const API_URL = "https://news-server-ut0z.onrender.com/api/news";

const newsGrid = document.getElementById('newsGrid');
const errorMessage = document.getElementById('errorMessage');
const emptyMessage = document.getElementById('emptyMessage');
const heroContainer = document.getElementById('heroContainer');
const secondaryContainer = document.getElementById('secondaryContainer');

// পেজিনেশনের জন্য গ্লোবাল ভ্যারিয়েবল
let lastVisible = null; 
let isLoading = false;
let hasMore = true;
let isFirstBatch = true; // প্রথম ব্যাচেই হিরো + সেকেন্ডারি লেআউট বসবে

// বিভাগ অনুযায়ী রঙ (real newsroom-এর মতো ক্যাটাগরি কালার-কোডিং)
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

// তারিখের ফরম্যাট করার জন্য
function formatDate(dateString) {
  if (!dateString) return "তারিখ পাওয়া যায়নি"; 
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; 
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-GB', options); 
  } catch (error) {
    return dateString;
  }
}

// একটি নিউজ আইটেম থেকে কার্ডে বসানোর মতো ডেটা তৈরি করে (হিরো/সেকেন্ডারি/গ্রিড—সব কার্ডেই ব্যবহার হয়)
function getCardData(item, excerptLength = 100) {
  const imageUrl = item.image || 'https://via.placeholder.com/400x250?text=No+Image';
  const headline = escapeHTML(item.headline || 'শিরোনাম নেই');
  const shortBody = escapeHTML(truncateText(item.body, excerptLength));
  const editorName = escapeHTML(item.editor || 'P.K EDITOR');
  const newsDate = formatDate(item.date || item.createdAt);
  const itemId = item.id || item._id;
  const badge = categoryBadgeHTML(item.category);
  return { imageUrl, headline, shortBody, editorName, newsDate, itemId, badge };
}

// স্কেলিটন লোডিং (HTML স্ট্রিং রিটার্ন করবে)
function getSkeletonsHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skel-card skeleton-loading-placeholder">
        <div class="skel-thumb shimmer"></div>
        <div class="skel-body">
          <div class="skel-line title-1 shimmer"></div>
          <div class="skel-line title-2 shimmer"></div>
          <div class="skel-line desc-1 shimmer"></div>
          <div class="skel-line desc-2 shimmer"></div>
          <div class="skel-line cta shimmer"></div>
        </div>
      </div>`;
  }
  return html;
}

// হিরো কার্ডের স্কেলিটন
function getHeroSkeletonHTML() {
  return `
    <div class="hero-card skel-hero skeleton-loading-placeholder">
      <div class="skel-thumb shimmer"></div>
    </div>`;
}

// সেকেন্ডারি কার্ডগুলোর স্কেলিটন
function getSecondarySkeletonHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="secondary-card skel-secondary skeleton-loading-placeholder">
        <div class="skel-thumb shimmer"></div>
        <div class="skel-body">
          <div class="skel-line title-1 shimmer"></div>
          <div class="skel-line title-2 shimmer"></div>
        </div>
      </div>`;
  }
  return html;
}

// স্কেলিটন রিমুভ করার ফাংশন
function removeSkeletons() {
  const skeletons = document.querySelectorAll('.skeleton-loading-placeholder');
  skeletons.forEach(el => el.remove());
}

// হিরো (শীর্ষ খবর) কার্ড রেন্ডার করে
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

// পাশের তালিকায় থাকা সেকেন্ডারি খবরগুলো রেন্ডার করে (ছোট থাম্বনেইল + শিরোনাম)
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

// নিউজ কার্ড তৈরি করে মূল গ্রিডে যুক্ত করার ফাংশন
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

// মূল API কল ফাংশন (Pagination সহ)
async function fetchNews() {
  if (isLoading || !hasMore) return; 

  try {
    isLoading = true;
    errorMessage.style.display = 'none';
    emptyMessage.style.display = 'none';

    // নতুন ডেটা আসার আগে স্কেলিটন দেখানো (প্রথমবার হিরো + সেকেন্ডারিও)
    if (isFirstBatch) {
      heroContainer.innerHTML = getHeroSkeletonHTML();
      secondaryContainer.innerHTML = getSecondarySkeletonHTML(3);
    }
    newsGrid.insertAdjacentHTML('beforeend', getSkeletonsHTML(6));

    let url = `${API_URL}?limit=20`;
    if (lastVisible) {
      url += `&lastVisible=${lastVisible}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // ডেটা চলে আসার পর স্কেলিটন সরিয়ে ফেলা
    removeSkeletons();

    if (!Array.isArray(data) || data.length === 0) {
      if (!lastVisible) {
        emptyMessage.style.display = 'block'; 
        if (isFirstBatch) {
          renderHero(null);
          renderSecondary([]);
        }
      }
      hasMore = false; 
      isLoading = false;
      return;
    }

    // শেষ নিউজের আইডি সেভ করা পরবর্তী পেজের জন্য
    lastVisible = data[data.length - 1].id;

    if (data.length < 20) {
      hasMore = false; // ২০টার কম হলে আর নিউজ নেই ধরে নেওয়া হবে
    }

    if (isFirstBatch) {
      // প্রথম আইটেম বড় হিরো কার্ড, পরের ৩টি পাশের সেকেন্ডারি তালিকায়, বাকিগুলো নিচের গ্রিডে
      isFirstBatch = false;
      const heroItem = data[0];
      const secondaryItems = data.slice(1, 4);
      const gridItems = data.slice(4);

      renderHero(heroItem);
      renderSecondary(secondaryItems);
      if (gridItems.length) appendNews(gridItems);
    } else {
      appendNews(data);
    }
    isLoading = false;
  } catch (error) {
    console.error('Error fetching news:', error);
    removeSkeletons();
    if (!lastVisible) {
      newsGrid.innerHTML = '';
      if (isFirstBatch) {
        heroContainer.innerHTML = '';
        secondaryContainer.innerHTML = '';
      }
      errorMessage.style.display = 'block';
    }
    isLoading = false;
  }
}

// স্ক্রল ডিটেকশন (Infinite Scroll)
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200) {
    fetchNews();
  }
});

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
}

// Initial load
document.addEventListener('DOMContentLoaded', fetchNews);

// =====================================
// সাইডবার মেনু কন্ট্রোল করার কোড
// =====================================
const menuBtn = document.getElementById('menuBtn');
const closeBtn = document.getElementById('closeBtn');
const sidebarMenu = document.getElementById('sidebarMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const searchBtn = document.getElementById('searchBtn');

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

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    alert("সার্চ ফিচারটি খুব শীঘ্রই আসছে!"); 
  });
}

// =====================================
// ডায়নামিক নিউজ টিকার (ব্রেকিং নিউজ)
// =====================================
async function loadDynamicTicker() {
  const tickerMove = document.querySelector('.ticker-move');
  if (!tickerMove) return;

  try {
    // টিকারে শুধু লেটেস্ট ৩টি নিউজ আনবে
    const response = await fetch(`${API_URL}?limit=3`);
    const data = await response.json();

    const recentNews = data.slice(0, 3);

    if (recentNews.length > 0) {
      let tickerHTML = '';
      const prefixes = ["সবচেয়ে বড় খবর: ", "এই মুহূর্তের আপডেট: ", "টাটকা খবর: "];

      recentNews.forEach((news, index) => {
        const prefix = prefixes[index]; 
        const headline = news.headline ? news.headline : 'শিরোনাম নেই';
        tickerHTML += `<span class="ticker-item">${prefix} ${headline}</span>`;
      });

      tickerHTML += `<span class="ticker-item">আরও নতুন খবর পেতে আমাদের সাথেই থাকুন...</span>`;
      tickerMove.innerHTML = tickerHTML;
    }
  } catch (error) {
    console.error("Ticker load error:", error);
    tickerMove.innerHTML = `
      <span class="ticker-item">সার্ভার থেকে খবর আনতে সমস্যা হচ্ছে...</span>
      <span class="ticker-item">আরও নতুন খবর পেতে আমাদের সাথেই থাকুন...</span>
    `;
  }
}

document.addEventListener('DOMContentLoaded', loadDynamicTicker);

// =====================================
// সাইডবার সাবমেনু (জেলা সমূহ / সম্পাদক) টগল লজিক
// =====================================
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
