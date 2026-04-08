/* Hi Fi PDF Tool Kit — UI Components */

const HiFiUI = {
  // --- File Upload Component ---
  createUploadZone(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const multiple = options.multiple !== false;
    const accept = options.accept || '.pdf';
    const maxSize = options.maxSize || 104857600; // 100MB
    
    container.innerHTML = `
      <div class="upload-zone" id="dropZone">
        <input type="file" id="fileInput" accept="${accept}" ${multiple ? 'multiple' : ''} class="sr-only">
        <div class="upload-zone__icon"><i class="fas fa-cloud-upload-alt"></i></div>
        <div class="upload-zone__title">Drop your ${accept === '.pdf' ? 'PDF' : 'files'} here</div>
        <div class="upload-zone__subtitle">or tap to browse • Max ${HiFiApp.formatSize(maxSize)}</div>
        <button class="upload-zone__btn" onclick="document.getElementById('fileInput').click()">
          <i class="fas fa-plus"></i> Select ${accept === '.pdf' ? 'PDF' : 'Files'}
        </button>
      </div>
      <div id="fileList" class="file-list mt-md hidden"></div>
    `;

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    this._selectedFiles = [];

    // Click to upload
    dropZone.addEventListener('click', (e) => {
      if (e.target.closest('.upload-zone__btn')) return;
      fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => this._handleFiles(e.target.files, multiple, maxSize, accept, options));

    // Drag & drop
    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this._handleFiles(e.dataTransfer.files, multiple, maxSize, accept, options);
    });
  },

  _handleFiles(fileList, multiple, maxSize, accept, options) {
    const files = Array.from(fileList);
    const exts = accept.split(',').map(e => e.trim().toLowerCase());
    
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (exts.length && exts[0] !== '' && !exts.some(a => ext === a || file.type.includes(a.replace('.', '')))) {
        HiFiApp.toast(`Unsupported file: ${file.name}`, 'error');
        continue;
      }
      if (file.size > maxSize) {
        HiFiApp.toast(`File too large: ${file.name}`, 'error');
        continue;
      }
      if (!multiple) this._selectedFiles = [];
      this._selectedFiles.push(file);
    }
    this._renderFileList();
    if (options.onFiles) options.onFiles(this._selectedFiles);
  },

  _renderFileList() {
    const list = document.getElementById('fileList');
    if (!list) return;
    if (this._selectedFiles.length === 0) { list.classList.add('hidden'); return; }
    list.classList.remove('hidden');
    list.innerHTML = this._selectedFiles.map((file, i) => `
      <div class="file-item animate-slide-up">
        <div class="file-item__icon"><i class="fas fa-file-pdf"></i></div>
        <div class="file-item__info">
          <div class="file-item__name">${file.name}</div>
          <div class="file-item__size">${HiFiApp.formatSize(file.size)}</div>
        </div>
        <button class="file-item__remove" onclick="HiFiUI.removeFile(${i})"><i class="fas fa-times"></i></button>
      </div>
    `).join('');
  },

  removeFile(index) {
    this._selectedFiles.splice(index, 1);
    this._renderFileList();
  },

  getFiles() { return this._selectedFiles || []; },

  // --- Progress Component ---
  createProgress(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card animate-slide-up">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div class="spinner"></div>
          <div>
            <div id="progressTitle" style="font-weight:600;font-size:0.9rem">Processing...</div>
            <div id="progressSubtitle" style="font-size:0.75rem;color:var(--text-tertiary)">Please wait</div>
          </div>
        </div>
        <div class="progress"><div class="progress__bar" id="progressBar"></div></div>
        <div id="progressPercent" style="text-align:right;font-size:0.75rem;color:var(--text-tertiary);margin-top:4px">0%</div>
      </div>
    `;
  },

  updateProgress(percent, title, subtitle) {
    const bar = document.getElementById('progressBar');
    const pct = document.getElementById('progressPercent');
    const ttl = document.getElementById('progressTitle');
    const sub = document.getElementById('progressSubtitle');
    if (bar) bar.style.width = percent + '%';
    if (pct) pct.textContent = Math.round(percent) + '%';
    if (title && ttl) ttl.textContent = title;
    if (subtitle && sub) sub.textContent = subtitle;
  },

  // --- Result Card ---
  showResult(containerId, { filename, originalSize, newSize, downloadUrl, downloadName }) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const savings = originalSize > 0 ? Math.round((1 - newSize / originalSize) * 100) : 0;
    container.innerHTML = `
      <div class="result-card animate-bounce-in">
        <div class="result-card__header">
          <div class="result-card__icon"><i class="fas fa-check"></i></div>
          <div class="result-card__info">
            <div class="result-card__filename">${filename || downloadName}</div>
            <div class="result-card__meta">${HiFiApp.formatSize(originalSize)} → ${HiFiApp.formatSize(newSize)}</div>
          </div>
          ${savings > 0 ? `<div class="result-card__savings">-${savings}% 🔥</div>` : ''}
        </div>
        <a href="${downloadUrl}" download="${downloadName}" class="btn btn--success btn--block" id="downloadBtn">
          <i class="fas fa-download"></i> Download
        </a>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn--secondary btn--sm" style="flex:1" onclick="HiFiUI.resetTool()"><i class="fas fa-redo"></i> Process Another</button>
          <button class="btn btn--secondary btn--sm" onclick="HiFiApp.shareTool(new URLSearchParams(location.search).get('id'))"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>
    `;
    HiFiApp.toast(savings > 0 ? `Reduced ${savings}%! 🔥` : 'Done! ✅', 'success');
  },

  resetTool() {
    location.reload();
  },

  // --- FAQ Accordion ---
  renderFAQ(containerId, faqs) {
    const container = document.getElementById(containerId);
    if (!container || !faqs || faqs.length === 0) return;
    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title"><i class="fas fa-question-circle text-primary"></i> FAQ</h2></div>
      ${faqs.map((faq, i) => `
        <div class="faq-item" style="margin:0 var(--container-padding)">
          <button class="faq-item__q" onclick="this.parentElement.classList.toggle('open')">
            <span>${faq.q}</span><i class="fas fa-chevron-down"></i>
          </button>
          <div class="faq-item__a"><div class="faq-item__a-inner">${faq.a}</div></div>
        </div>
      `).join('')}
    `;
  },

  // --- Steps Guide ---
  renderSteps(containerId, steps) {
    const container = document.getElementById(containerId);
    if (!container || !steps || steps.length === 0) return;
    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title"><i class="fas fa-list-ol text-primary"></i> How to Use</h2></div>
      <div class="steps">
        ${steps.map(step => `<div class="step"><div class="step__content"><div class="step__title">${step}</div></div></div>`).join('')}
      </div>
    `;
  },

  // --- Benefits Section ---
  renderBenefits(containerId, benefits) {
    const container = document.getElementById(containerId);
    if (!container || !benefits || benefits.length === 0) return;
    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title"><i class="fas fa-star text-primary"></i> Benefits</h2></div>
      <div class="benefits-grid">
        ${benefits.map(b => `
          <div class="benefit-card">
            <div class="benefit-card__icon">${b.icon}</div>
            <div class="benefit-card__title">${b.title}</div>
            <div class="benefit-card__desc">${b.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- Related Tools ---
  renderRelated(containerId, toolId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const related = getRelatedTools(toolId);
    if (related.length === 0) return;
    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title"><i class="fas fa-th text-primary"></i> Related Tools</h2></div>
      <div class="related-tools">
        ${related.map(tool => `
          <a href="tool.html?id=${tool.id}" class="tool-card" style="min-width:110px" onclick="HiFiApp.addRecent('${tool.id}')">
            <div class="tool-card__icon ${tool.iconBg}"><i class="${tool.icon}"></i></div>
            <span class="tool-card__name">${tool.name}</span>
          </a>
        `).join('')}
      </div>
    `;
  },

  // --- Tool Page Specific Controls ---
  renderCompressionControls(containerId, targetSize) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (targetSize) {
      container.innerHTML = `
        <div class="result-card mb-md" style="text-align:center">
          <div style="font-size:0.85rem;color:var(--text-secondary)">Target Size</div>
          <div style="font-size:2rem;font-weight:800;color:var(--primary);font-family:var(--font-heading)">${targetSize >= 1024 ? (targetSize / 1024) + ' MB' : targetSize + ' KB'}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary)">Auto-optimized for best quality</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="result-card mb-md">
          <div class="setting-row" style="padding:0">
            <div><div class="setting-row__label">Compression Level</div>
            <div class="setting-row__desc">Higher = smaller file</div></div>
            <span id="compLevelVal" style="font-weight:700;color:var(--primary)">Medium</span>
          </div>
          <input type="range" id="compLevel" min="1" max="3" value="2" style="margin-top:12px"
            oninput="document.getElementById('compLevelVal').textContent=['Low','Medium','High'][this.value-1]">
          <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-tertiary);margin-top:4px">
            <span>Better Quality</span><span>Smaller Size</span>
          </div>
        </div>
        <div class="result-card mb-md">
          <div class="setting-row" style="padding:0">
            <div><div class="setting-row__label">Custom Target Size</div>
            <div class="setting-row__desc">Optional — leave empty for auto</div></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <input type="number" id="customSize" placeholder="e.g. 500" style="flex:1;padding:10px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none;font-size:0.9rem">
            <select id="customUnit" class="select" style="width:80px"><option value="kb">KB</option><option value="mb">MB</option></select>
          </div>
        </div>
      `;
    }
  },

  renderRotateControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row__label mb-sm">Rotation Angle</div>
        <div style="display:flex;gap:8px">
          ${[90, 180, 270].map(deg => `<button class="btn btn--secondary btn--sm rotation-btn" data-deg="${deg}" onclick="document.querySelectorAll('.rotation-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');this.classList.add('btn--primary');this.classList.remove('btn--secondary')"><i class="fas fa-redo" style="transform:rotate(${deg}deg)"></i> ${deg}°</button>`).join('')}
        </div>
        <div class="setting-row mt-md" style="padding:0">
          <div><div class="setting-row__label">Apply to all pages</div></div>
          <label class="toggle"><input type="checkbox" id="rotateAll" checked><span class="toggle__slider"></span></label>
        </div>
      </div>
    `;
  },

  renderWatermarkControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row__label mb-sm">Watermark Text</div>
        <input type="text" id="watermarkText" placeholder="e.g. CONFIDENTIAL" style="width:100%;padding:10px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none;font-size:0.9rem">
        <div style="display:flex;gap:8px;margin-top:12px">
          <div style="flex:1">
            <div class="setting-row__label mb-sm" style="font-size:0.75rem">Opacity</div>
            <input type="range" id="watermarkOpacity" min="10" max="90" value="30">
          </div>
          <div style="flex:1">
            <div class="setting-row__label mb-sm" style="font-size:0.75rem">Font Size</div>
            <input type="range" id="watermarkSize" min="20" max="100" value="50">
          </div>
        </div>
        <div class="setting-row__label mb-sm mt-md" style="font-size:0.75rem">Color</div>
        <input type="color" id="watermarkColor" value="#cccccc" style="width:48px;height:36px;border:none;border-radius:var(--radius-sm);cursor:pointer">
      </div>
    `;
  },

  renderPageNumberControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row__label mb-sm">Position</div>
        <select id="pageNumPosition" class="select">
          <option value="bottom-center">Bottom Center</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="top-center">Top Center</option>
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
        </select>
        <div class="setting-row__label mb-sm mt-md">Starting Number</div>
        <input type="number" id="startNumber" value="1" min="1" style="width:100%;padding:10px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none">
        <div class="setting-row__label mb-sm mt-md">Format</div>
        <select id="pageNumFormat" class="select">
          <option value="numeric">1, 2, 3...</option>
          <option value="dash">- 1 -, - 2 -...</option>
          <option value="page">Page 1, Page 2...</option>
          <option value="of">1 of N, 2 of N...</option>
        </select>
      </div>
    `;
  },

  renderProtectControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row__label mb-sm">Set Password</div>
        <div style="position:relative">
          <input type="password" id="pdfPassword" placeholder="Enter password" style="width:100%;padding:10px;padding-right:44px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none">
          <button onclick="const i=document.getElementById('pdfPassword');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);background:none;border:none;cursor:pointer"><i class="fas fa-eye"></i></button>
        </div>
        <div class="setting-row__label mb-sm mt-md">Confirm Password</div>
        <input type="password" id="pdfPasswordConfirm" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none">
      </div>
    `;
  },

  renderUnlockControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row__label mb-sm">Enter PDF Password</div>
        <div style="position:relative">
          <input type="password" id="unlockPassword" placeholder="Enter current password" style="width:100%;padding:10px;padding-right:44px;border-radius:var(--radius-md);border:1.5px solid var(--border);background:var(--bg-primary);color:var(--text-primary);outline:none">
          <button onclick="const i=document.getElementById('unlockPassword');i.type=i.type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);background:none;border:none;cursor:pointer"><i class="fas fa-eye"></i></button>
        </div>
      </div>
    `;
  },

  renderImageConvertControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="result-card mb-md">
        <div class="setting-row" style="padding:0">
          <div><div class="setting-row__label">Page Size</div></div>
          <select id="pageSize" class="select" style="width:120px">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
            <option value="fit">Fit to Image</option>
          </select>
        </div>
        <div class="setting-row mt-md" style="padding:0">
          <div><div class="setting-row__label">Orientation</div></div>
          <select id="orientation" class="select" style="width:120px">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div class="setting-row mt-md" style="padding:0">
          <div><div class="setting-row__label">Margin</div></div>
          <select id="imgMargin" class="select" style="width:120px">
            <option value="0">None</option>
            <option value="10" selected>Small</option>
            <option value="20">Medium</option>
            <option value="40">Large</option>
          </select>
        </div>
      </div>
    `;
  }
};
