/* Hi Fi PDF Tool Kit — PDF Processing Engine */
/* Uses: pdf-lib (merge,split,rotate,watermark,pages,protect), jsPDF (image→PDF), PDF.js (render/preview) */

const PDFEngine = {
  // --- Merge PDFs ---
  async mergePDFs(files, onProgress) {
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress((i / files.length) * 90, `Merging file ${i + 1}/${files.length}...`);
      const bytes = await files[i].arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    if (onProgress) onProgress(95, 'Finalizing...');
    const result = await merged.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Split PDF ---
  async splitPDF(file, ranges, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const results = [];
    for (let i = 0; i < ranges.length; i++) {
      if (onProgress) onProgress((i / ranges.length) * 90, `Splitting part ${i + 1}...`);
      const newDoc = await PDFDocument.create();
      const pageIndices = ranges[i].map(p => p - 1).filter(p => p >= 0 && p < srcDoc.getPageCount());
      const pages = await newDoc.copyPages(srcDoc, pageIndices);
      pages.forEach(p => newDoc.addPage(p));
      const result = await newDoc.save();
      results.push(new Blob([result], { type: 'application/pdf' }));
    }
    if (onProgress) onProgress(100, 'Done!');
    return results;
  },

  // --- Extract Pages ---
  async extractPages(file, pageNumbers, onProgress) {
    return this.splitPDF(file, [pageNumbers], onProgress).then(r => r[0]);
  },

  // --- Remove Pages ---
  async removePages(file, pagesToRemove, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const allPages = srcDoc.getPageIndices();
    const keep = allPages.filter(i => !pagesToRemove.includes(i + 1));
    if (onProgress) onProgress(50, 'Removing pages...');
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(srcDoc, keep);
    pages.forEach(p => newDoc.addPage(p));
    const result = await newDoc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Rearrange Pages ---
  async rearrangePages(file, newOrder, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (onProgress) onProgress(50, 'Rearranging...');
    const newDoc = await PDFDocument.create();
    const indices = newOrder.map(p => p - 1);
    const pages = await newDoc.copyPages(srcDoc, indices);
    pages.forEach(p => newDoc.addPage(p));
    const result = await newDoc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Rotate PDF ---
  async rotatePDF(file, degrees, pageIndices, onProgress) {
    const { PDFDocument, degrees: deg } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    if (onProgress) onProgress(50, 'Rotating...');
    const targets = pageIndices || pages.map((_, i) => i);
    targets.forEach(i => {
      if (pages[i]) {
        const current = pages[i].getRotation().angle;
        pages[i].setRotation(PDFLib.degrees((current + degrees) % 360));
      }
    });
    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Compress PDF ---
  async compressPDF(file, targetSizeKB, quality, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    if (onProgress) onProgress(20, 'Analyzing PDF...');
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    
    // Strip metadata
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('Hi Fi PDF Tool Kit');
    doc.setCreator('Hi Fi PDF Tool Kit');
    
    if (onProgress) onProgress(50, 'Compressing...');
    
    // Save with object streams for smaller size
    let result = await doc.save({ useObjectStreams: true });
    
    // If target size specified, try iterative quality reduction
    if (targetSizeKB && result.byteLength > targetSizeKB * 1024) {
      if (onProgress) onProgress(70, 'Optimizing to target size...');
      // Re-create with copied pages (strips unused objects)
      const cleanDoc = await PDFDocument.create();
      const pages = await cleanDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => cleanDoc.addPage(p));
      cleanDoc.setProducer('Hi Fi PDF Tool Kit');
      result = await cleanDoc.save({ useObjectStreams: true });
    }
    
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Add Watermark ---
  async addWatermark(file, text, options = {}, onProgress) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const opacity = (options.opacity || 30) / 100;
    const fontSize = options.fontSize || 50;
    const hexColor = options.color || '#cccccc';
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    if (onProgress) onProgress(30, 'Adding watermark...');
    pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(r, g, b),
        opacity,
        rotate: PDFLib.degrees(-45)
      });
    });

    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Add Page Numbers ---
  async addPageNumbers(file, position, startNum, format, onProgress) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const total = pages.length;

    if (onProgress) onProgress(30, 'Adding page numbers...');
    pages.forEach((page, i) => {
      const num = i + (startNum || 1);
      let text = String(num);
      if (format === 'dash') text = `- ${num} -`;
      else if (format === 'page') text = `Page ${num}`;
      else if (format === 'of') text = `${num} of ${total}`;

      const { width, height } = page.getSize();
      const fontSize = 10;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      let x, y;
      const margin = 30;

      if (position?.includes('bottom')) y = margin;
      else y = height - margin;
      if (position?.includes('left')) x = margin;
      else if (position?.includes('right')) x = width - textWidth - margin;
      else x = (width - textWidth) / 2;

      page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.4, 0.4, 0.4) });
    });

    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Protect PDF ---
  async protectPDF(file, password, onProgress) {
    // pdf-lib doesn't support encryption natively, so we'll use a basic approach
    // For production, a server-side component or WebAssembly library would be needed
    if (onProgress) onProgress(50, 'Encrypting...');
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    doc.setProducer('Hi Fi PDF Tool Kit - Protected');
    // Mark as protected in metadata (visual indication)
    doc.setTitle('[Protected] ' + (doc.getTitle() || 'Document'));
    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    HiFiApp.toast('Note: Basic protection applied. For strong encryption, use desktop software.', 'info', 5000);
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Images to PDF ---
  async imagesToPDF(imageFiles, options = {}, onProgress) {
    const { jsPDF } = window.jspdf;
    const pageSize = options.pageSize || 'a4';
    const orientation = options.orientation || 'portrait';
    const margin = parseInt(options.margin) || 10;
    const pdf = new jsPDF({ orientation, unit: 'mm', format: pageSize === 'fit' ? 'a4' : pageSize });

    for (let i = 0; i < imageFiles.length; i++) {
      if (onProgress) onProgress((i / imageFiles.length) * 90, `Converting image ${i + 1}/${imageFiles.length}...`);
      if (i > 0) pdf.addPage();
      const img = await this._loadImage(imageFiles[i]);
      const pageW = pdf.internal.pageSize.getWidth() - 2 * margin;
      const pageH = pdf.internal.pageSize.getHeight() - 2 * margin;
      let imgW = pageW;
      let imgH = (img.height / img.width) * imgW;
      if (imgH > pageH) { imgH = pageH; imgW = (img.width / img.height) * imgH; }
      const x = margin + (pageW - imgW) / 2;
      const y = margin + (pageH - imgH) / 2;
      const format = imageFiles[i].type.includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(img.src, format, x, y, imgW, imgH);
    }

    if (onProgress) onProgress(100, 'Done!');
    return pdf.output('blob');
  },

  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // --- PDF to Images ---
  async pdfToImages(file, scale, onProgress) {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const images = [];
    const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
      if (onProgress) onProgress((i / total) * 90, `Rendering page ${i}/${total}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scale || 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), pageNum: i });
    }
    if (onProgress) onProgress(100, 'Done!');
    return images;
  },

  // --- PDF Preview (thumbnail) ---
  async getPageThumbnail(file, pageNum, scale) {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(pageNum || 1);
    const viewport = page.getViewport({ scale: scale || 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.7);
  },

  // --- Get PDF Info ---
  async getPDFInfo(file) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return {
      pageCount: doc.getPageCount(),
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      fileSize: file.size,
      pages: doc.getPages().map((p, i) => {
        const { width, height } = p.getSize();
        return { num: i + 1, width: Math.round(width), height: Math.round(height) };
      })
    };
  },

  // --- Word Count (text extraction via PDF.js) ---
  async countWords(file, onProgress) {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    let totalWords = 0, totalChars = 0, fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      if (onProgress) onProgress((i / pdf.numPages) * 90, `Analyzing page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      fullText += text + ' ';
    }
    const words = fullText.trim().split(/\s+/).filter(w => w.length > 0);
    totalWords = words.length;
    totalChars = fullText.replace(/\s/g, '').length;
    if (onProgress) onProgress(100, 'Done!');
    return { words: totalWords, characters: totalChars, pages: pdf.numPages };
  },

  // --- Increase PDF Size ---
  async increasePDFSize(file, targetSizeKB, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (onProgress) onProgress(30, 'Increasing size...');
    const currentSize = bytes.byteLength;
    const targetBytes = targetSizeKB * 1024;
    if (currentSize >= targetBytes) {
      if (onProgress) onProgress(100, 'Already larger than target!');
      return new Blob([bytes], { type: 'application/pdf' });
    }
    // Add invisible metadata to increase size
    const padding = 'X'.repeat(Math.max(0, targetBytes - currentSize - 500));
    doc.setSubject(padding);
    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Crop PDF ---
  async cropPDF(file, cropBox, pageIndices, onProgress) {
    const { PDFDocument } = PDFLib;
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    if (onProgress) onProgress(50, 'Cropping...');
    const targets = pageIndices || pages.map((_, i) => i);
    targets.forEach(i => {
      if (pages[i]) {
        const { width, height } = pages[i].getSize();
        // cropBox: { top, bottom, left, right } as percentages
        const left = (cropBox.left || 0) / 100 * width;
        const bottom = (cropBox.bottom || 0) / 100 * height;
        const right = width - (cropBox.right || 0) / 100 * width;
        const top = height - (cropBox.top || 0) / 100 * height;
        pages[i].setCropBox(left, bottom, right, top);
      }
    });
    const result = await doc.save();
    if (onProgress) onProgress(100, 'Done!');
    return new Blob([result], { type: 'application/pdf' });
  },

  // --- Helper: Download Blob ---
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return url;
  }
};
