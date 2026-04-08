/* Hi Fi PDF Tool Kit — Application Shell */

const HiFiApp = {
  // --- Theme Management ---
  initTheme() {
    const saved = localStorage.getItem('hifi-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);
  },
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hifi-theme', next);
    this.updateThemeIcon(next);
  },
  updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  },

  // --- Toast Notifications ---
  toast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:var(--${type})"></i><span class="toast__msg">${message}</span><button class="toast__close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
  },

  // --- Recent Tools History ---
  getRecent() {
    try { return JSON.parse(localStorage.getItem('hifi-recent') || '[]'); } catch { return []; }
  },
  addRecent(toolId) {
    let recent = this.getRecent().filter(id => id !== toolId);
    recent.unshift(toolId);
    if (recent.length > 10) recent = recent.slice(0, 10);
    localStorage.setItem('hifi-recent', JSON.stringify(recent));
  },

  // --- Presets ---
  getPresets() {
    try { return JSON.parse(localStorage.getItem('hifi-presets') || '[]'); } catch { return []; }
  },
  savePreset(name, toolId, settings) {
    const presets = this.getPresets();
    presets.push({ id: Date.now(), name, toolId, settings, created: new Date().toISOString() });
    localStorage.setItem('hifi-presets', JSON.stringify(presets));
    this.toast('Preset saved!', 'success');
  },
  deletePreset(id) {
    const presets = this.getPresets().filter(p => p.id !== id);
    localStorage.setItem('hifi-presets', JSON.stringify(presets));
  },

  // --- Search ---
  initSearch() {
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('searchClear');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (clear) clear.classList.toggle('visible', q.length > 0);
      this.handleSearch(q);
    });
    if (clear) clear.addEventListener('click', () => { input.value = ''; clear.classList.remove('visible'); this.handleSearch(''); });
  },
  handleSearch(query) {
    const results = searchTools(query);
    this.renderToolsGrid(results);
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.classList.toggle('hidden', results.length > 0);
  },

  // --- Category Tabs ---
  initCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const catId = tab.dataset.category;
        const tools = getToolsByCategory(catId);
        this.renderToolsGrid(tools);
        // Smooth scroll to grid
        const grid = document.getElementById('toolsGrid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  },

  // --- Render Tools Grid (iLovePDF-style with descriptions) ---
  renderToolsGrid(tools) {
    const grid = document.getElementById('toolsGrid');
    if (!grid) return;
    grid.innerHTML = tools.map((tool, i) => `
      <a href="tool.html?id=${tool.id}" class="tool-card animate-slide-up" style="animation-delay: ${Math.min(i * 0.04, 1)}s; animation-fill-mode: both;" id="card-${tool.id}" onclick="HiFiApp.addRecent('${tool.id}')">
        ${tool.badge ? `<span class="tool-card__badge tool-card__badge--${tool.badge === 'hot' ? 'hot' : tool.badge === 'new' ? 'new' : 'pro'}">${tool.badge}</span>` : ''}
        <div class="tool-card__icon ${tool.iconBg}"><i class="${tool.icon}"></i></div>
        <span class="tool-card__name">${tool.name}</span>
        <span class="tool-card__desc">${tool.desc}</span>
      </a>
    `).join('');
  },

  // --- Render Recent Tools ---
  renderRecent() {
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentGrid');
    if (!section || !grid) return;
    const recent = this.getRecent();
    if (recent.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    const tools = recent.map(id => getToolById(id)).filter(Boolean).slice(0, 6);
    grid.innerHTML = tools.map((tool, i) => `
      <a href="tool.html?id=${tool.id}" class="tool-card animate-slide-up" style="animation-delay: ${i * 0.08}s; animation-fill-mode: both;">
        <div class="tool-card__icon ${tool.iconBg}"><i class="${tool.icon}"></i></div>
        <span class="tool-card__name">${tool.name}</span>
        <span class="tool-card__desc">${tool.desc}</span>
      </a>
    `).join('');
  },

  // --- Share Tool ---
  shareTool(toolId) {
    const tool = getToolById(toolId);
    if (!tool) return;
    const url = `${window.location.origin}/tool.html?id=${toolId}`;
    if (navigator.share) {
      navigator.share({ title: `${tool.name} — Hi Fi PDF Tool Kit`, text: tool.desc, url });
    } else {
      navigator.clipboard.writeText(url).then(() => this.toast('Link copied!', 'success'));
    }
  },

  // --- Format File Size ---
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // --- Bottom Nav Active State ---
  initBottomNav() {
    const items = document.querySelectorAll('.bottom-nav__item');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    items.forEach(item => {
      if (item.getAttribute('href') === currentPage || (currentPage === '' && item.getAttribute('href') === 'index.html')) {
        item.classList.add('active');
      }
    });
  },

  // --- Initialize ---
  init() {
    this.initTheme();
    this.initSearch();
    this.initCategoryTabs();
    this.renderRecent();
    this.initBottomNav();

    // Initialize full-page animations
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, once: true, offset: 50 });
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
};

document.addEventListener('DOMContentLoaded', () => HiFiApp.init());
