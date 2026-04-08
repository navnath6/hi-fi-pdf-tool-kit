/* Hi Fi PDF Tool Kit — SEO Engine */

const SEOEngine = {
  setMeta(tool) {
    if (!tool) return;
    document.title = `${tool.name} — Free Online | Hi Fi PDF Tool Kit`;
    this._setTag('meta[name="description"]', 'content', tool.metaDesc || tool.desc + ' Fast, 100% secure, offline browser-based PDF processing. No uploads. No signups.');
    this._setTag('meta[name="keywords"]', 'content', (tool.keywords || '') + ', offline pdf, secure pdf, no upload pdf');
    // Open Graph
    this._setTag('meta[property="og:title"]', 'content', `${tool.name} — Hi Fi PDF Tool Kit`);
    this._setTag('meta[property="og:description"]', 'content', tool.metaDesc || tool.desc);
    this._setTag('meta[property="og:type"]', 'content', 'website');
    this._setTag('meta[property="og:url"]', 'content', window.location.href);
    // Twitter
    this._setTag('meta[name="twitter:card"]', 'content', 'summary');
    this._setTag('meta[name="twitter:title"]', 'content', `${tool.name} — Hi Fi PDF Tool Kit`);
    this._setTag('meta[name="twitter:description"]', 'content', tool.metaDesc || tool.desc);
    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.href.split('?')[0] + '?id=' + tool.id;
  },

  _setTag(selector, attr, value) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const parts = selector.match(/\[(.+?)="(.+?)"\]/);
      if (parts) el.setAttribute(parts[1], parts[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  },

  injectJSONLD(tool) {
    if (!tool) return;
    const existing = document.getElementById('jsonld-tool');
    if (existing) existing.remove();
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": `${tool.name} — Hi Fi PDF Tool Kit`,
      "description": tool.metaDesc || tool.desc,
      "url": window.location.href,
      "applicationCategory": "UtilityApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
      "creator": { "@type": "Organization", "name": "Hi Fi PDF Tool Kit" }
    };
    if (tool.faq && tool.faq.length > 0) {
      schema.mainEntity = tool.faq.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }));
    }
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'jsonld-tool';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  },

  injectBreadcrumbs(containerId, tool) {
    const container = document.getElementById(containerId);
    if (!container || !tool) return;
    const cat = TOOL_CATEGORIES.find(c => c.id === tool.category);
    container.innerHTML = `
      <nav style="padding:var(--space-sm) var(--container-padding);font-size:var(--fs-xs);color:var(--text-tertiary)">
        <a href="index.html" style="color:var(--text-tertiary)">Home</a>
        <i class="fas fa-chevron-right" style="font-size:0.6rem;margin:0 4px"></i>
        <a href="index.html#${tool.category}" style="color:var(--text-tertiary)">${cat ? cat.name : 'Tools'}</a>
        <i class="fas fa-chevron-right" style="font-size:0.6rem;margin:0 4px"></i>
        <span style="color:var(--primary)">${tool.name}</span>
      </nav>
    `;
    // Breadcrumb JSON-LD
    const breadcrumbLD = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": window.location.origin + "/index.html" },
        { "@type": "ListItem", "position": 2, "name": cat ? cat.name : 'Tools', "item": window.location.origin + "/index.html#" + tool.category },
        { "@type": "ListItem", "position": 3, "name": tool.name }
      ]
    };
    let bcScript = document.getElementById('jsonld-breadcrumb');
    if (!bcScript) { bcScript = document.createElement('script'); bcScript.type = 'application/ld+json'; bcScript.id = 'jsonld-breadcrumb'; document.head.appendChild(bcScript); }
    bcScript.textContent = JSON.stringify(breadcrumbLD);
  },

  // For programmatic SEO pages
  setSizeMeta(sizeLabel, type) {
    const action = type === 'resize' ? 'Resize' : 'Compress';
    document.title = `${action} PDF to ${sizeLabel} Free Online — Private & Secure`;
    this._setTag('meta[name="description"]', 'content', `${action} PDF to ${sizeLabel} online for free. Fast, 100% secure, and accurate WebAssembly browser processing. No files uploaded. Perfect for government forms & exams — Hi Fi PDF Tool Kit.`);
    this._setTag('meta[name="keywords"]', 'content', `${action.toLowerCase()} pdf to ${sizeLabel.toLowerCase()}, reduce pdf to ${sizeLabel.toLowerCase()}, ${sizeLabel.toLowerCase()} pdf size, offline pdf reducer, secure pdf compress`);
  }
};
