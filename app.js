(() => {
  const input = document.querySelector('#file-input');
  const dropzone = document.querySelector('#dropzone');
  const fileArea = document.querySelector('#file-area');
  const list = document.querySelector('#file-list');
  const mergeButton = document.querySelector('#merge-button');
  const sizeSummary = document.querySelector('#size-summary');
  const progressWrap = document.querySelector('#progress-wrap');
  const progressBar = document.querySelector('#progress-bar');
  const progressLabel = document.querySelector('#progress-label');
  const progressPercent = document.querySelector('#progress-percent');
  const result = document.querySelector('#result');
  const toast = document.querySelector('#toast');
  let files = [];
  let busy = false;
  let mode = 'merge';
  let toastTimer;

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function updateSummary() {
    const total = files.reduce((sum, item) => sum + item.file.size, 0);
    if (!files.length) {
      sizeSummary.innerHTML = '<span class="summary-icon">↗</span><span>Add PDFs to get started</span>';
      return;
    }
    sizeSummary.innerHTML = `<span class="summary-icon">⌑</span><span class="summary-detail">${files.length} PDF${files.length === 1 ? '' : 's'} <span style="color:#c6c3ca;padding:0 4px">·</span> ${formatSize(total)} total</span>`;
  }

  function render() {
    fileArea.hidden = files.length === 0;
    document.querySelector('#file-count').textContent = String(files.length);
    list.replaceChildren();

    files.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = 'file-row';
      row.draggable = true;
      row.dataset.id = item.id;
      row.innerHTML = '<span class="drag-handle" aria-label="Drag to reorder">⠿</span><span class="pdf-icon">PDF</span><div class="file-meta"><div class="file-name"></div><div class="file-detail"></div></div><span class="file-pages"></span><button class="remove-file" type="button" aria-label="Remove PDF">×</button>';
      row.querySelector('.file-name').textContent = item.file.name;
      row.querySelector('.file-detail').textContent = formatSize(item.file.size);
      row.querySelector('.file-pages').textContent = item.pages ? `${item.pages} page${item.pages === 1 ? '' : 's'}` : 'PDF';
      row.querySelector('.remove-file').addEventListener('click', () => {
        files = files.filter((entry) => entry.id !== item.id);
        render();
      });
      row.addEventListener('dragstart', (event) => {
        row.classList.add('dragging-row');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging-row'));
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('drag-over');
        const movingId = event.dataTransfer.getData('text/plain');
        const from = files.findIndex((entry) => entry.id === movingId);
        const to = files.findIndex((entry) => entry.id === item.id);
        if (from < 0 || to < 0 || from === to) return;
        const [moved] = files.splice(from, 1);
        files.splice(to, 0, moved);
        render();
      });
      list.append(row);
    });

    mergeButton.disabled = (mode === 'merge' ? files.length < 2 : files.length < 1) || busy;
    mergeButton.querySelector('.merge-label').textContent = mode === 'merge' ? 'Merge PDFs' : 'Compress PDFs';
    updateSummary();
  }

  async function addFiles(fileList) {
    const chosen = Array.from(fileList || []);
    if (!chosen.length) return;
    const accepted = chosen.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (accepted.length !== chosen.length) showToast('A few files were skipped. Fold only accepts PDFs.');
    const added = [];
    for (const file of accepted) {
      try {
        let pages = 0;
        if (window.PDFLib) {
          const parsed = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
          pages = parsed.getPageCount();
        }
        added.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, file, pages });
      } catch (error) {
        showToast(`Could not read “${file.name}”. Check that it is a valid, unlocked PDF.`);
      }
    }
    files.push(...added);
    render();
    input.value = '';
  }

  document.querySelector('#browse-button').addEventListener('click', (event) => {
    event.stopPropagation();
    input.click();
  });
  document.querySelector('#add-more').addEventListener('click', () => input.click());
  dropzone.addEventListener('click', (event) => {
    if (!event.target.closest('button')) input.click();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => addFiles(input.files));
  for (const name of ['dragenter', 'dragover']) {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragging');
    });
  }
  for (const name of ['dragleave', 'drop']) {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      if (name === 'drop') addFiles(event.dataTransfer.files);
      dropzone.classList.remove('dragging');
    });
  }
  document.querySelector('#clear-button').addEventListener('click', () => {
    files = [];
    result.hidden = true;
    render();
  });

  function setMode(nextMode) {
    mode = nextMode;
    const compressing = mode === 'compress';
    document.querySelector('#compress-settings').hidden = !compressing;
    document.querySelector('#merge-nav').classList.toggle('active', !compressing);
    document.querySelector('#compress-nav').classList.toggle('active', compressing);
    document.querySelector('#work-title').textContent = compressing ? 'Make your PDFs smaller' : 'Bring your PDFs together';
    document.querySelector('#work-description').textContent = compressing
      ? 'Add one or more PDFs and choose a resolution for the compressed copy.'
      : 'Drop in your files, then arrange them in the order you want.';
    mergeButton.querySelector('.merge-label').textContent = compressing ? 'Compress PDFs' : 'Merge PDFs';
    render();
  }

  function canvasToJpeg(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode a PDF page image.')), 'image/jpeg', quality);
    });
  }

  async function compressPdfs() {
    if (!window.pdfjsLib) throw new Error('The PDF rendering engine did not load. Check your internet connection and refresh.');
    const dpiSettings = { compact: { dpi: 110, quality: 0.66 }, balanced: { dpi: 144, quality: 0.78 }, clear: { dpi: 180, quality: 0.86 } };
    const setting = dpiSettings[document.querySelector('#compression-level').value];
    const compressed = await window.PDFLib.PDFDocument.create();
    let completedPages = 0;
    const pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const item = files[fileIndex];
      progressLabel.textContent = `Reading ${item.file.name}`;
      const source = await pdfjs.getDocument({ data: await item.file.arrayBuffer(), isEvalSupported: false }).promise;
      try {
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          progressLabel.textContent = `Compressing ${item.file.name} · page ${pageNumber} of ${source.numPages}`;
          const page = await source.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          let scale = setting.dpi / 72;
          const pixelScaleCap = Math.sqrt(16000000 / (baseViewport.width * baseViewport.height));
          const dimensionCap = 8000 / Math.max(baseViewport.width, baseViewport.height);
          scale = Math.min(scale, pixelScaleCap, dimensionCap);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;
          const jpgBlob = await canvasToJpeg(canvas, setting.quality);
          const image = await compressed.embedJpg(await jpgBlob.arrayBuffer());
          const outputPage = compressed.addPage([baseViewport.width, baseViewport.height]);
          outputPage.drawImage(image, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
          completedPages += 1;
          const percent = Math.round(((fileIndex + pageNumber / source.numPages) / files.length) * 90);
          progressBar.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        await source.destroy();
      }
    }

    progressLabel.textContent = 'Building your compressed PDF…';
    const bytes = await compressed.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fold-compressed-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressLabel.textContent = 'Your compressed PDF is ready.';
    const difference = ((1 - bytes.length / files.reduce((sum, item) => sum + item.file.size, 0)) * 100);
    if (difference > 0) {
      result.textContent = `Done — ${formatSize(bytes.length)} compressed PDF downloaded (${Math.round(difference)}% smaller). The output contains images of each page.`;
      result.className = 'result';
    } else {
      result.textContent = `Done — ${formatSize(bytes.length)} PDF downloaded. This file was already compact, so converting the pages to images did not reduce its size.`;
      result.className = 'result';
    }
    result.hidden = false;
  }

  mergeButton.addEventListener('click', async () => {
    if ((mode === 'merge' && files.length < 2) || (mode === 'compress' && files.length < 1) || busy) return;
    if (!window.PDFLib) {
      result.textContent = 'The PDF engine could not load. Check your internet connection and refresh the page to try again.';
      result.className = 'result error';
      result.hidden = false;
      return;
    }

    busy = true;
    result.hidden = true;
    progressWrap.hidden = false;
    mergeButton.querySelector('.merge-label').textContent = mode === 'merge' ? 'Merging…' : 'Compressing…';
    mergeButton.disabled = true;
    progressBar.style.width = '0%';
    try {
      if (mode === 'compress') {
        await compressPdfs();
        return;
      }
      const merged = await window.PDFLib.PDFDocument.create();
      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        progressLabel.textContent = `Adding ${item.file.name}`;
        const source = await window.PDFLib.PDFDocument.load(await item.file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
        const copiedPages = await merged.copyPages(source, source.getPageIndices());
        copiedPages.forEach((page) => merged.addPage(page));
        const percent = Math.round(((index + 1) / files.length) * 92);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      progressLabel.textContent = 'Preparing your download…';
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fold-merged-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';
      progressLabel.textContent = 'Your merged PDF is ready.';
      result.textContent = `Done — ${files.length} PDFs combined into one file. Your download should start automatically.`;
      result.className = 'result';
      result.hidden = false;
    } catch (error) {
      console.error('PDF merge failed:', error);
      result.textContent = mode === 'compress'
        ? 'Compression could not be completed. Check that the PDFs are not damaged or password protected, then try a lower resolution or a smaller batch.'
        : 'One of these PDFs could not be merged. It may be damaged, password protected, or too large for this device’s available memory.';
      result.className = 'result error';
      result.hidden = false;
      progressLabel.textContent = 'Merge could not be completed.';
    } finally {
      busy = false;
      mergeButton.querySelector('.merge-label').textContent = mode === 'merge' ? 'Merge PDFs' : 'Compress PDFs';
      render();
    }
  });

  document.querySelector('#merge-nav').addEventListener('click', (event) => {
    event.preventDefault();
    setMode('merge');
    window.scrollTo({ top: document.querySelector('.workbench').offsetTop - 24, behavior: 'smooth' });
  });
  document.querySelector('#compress-nav').addEventListener('click', (event) => {
    event.preventDefault();
    setMode('compress');
    window.scrollTo({ top: document.querySelector('.workbench').offsetTop - 24, behavior: 'smooth' });
  });
  document.querySelector('#try-compress').addEventListener('click', () => {
    setMode('compress');
    window.scrollTo({ top: document.querySelector('.workbench').offsetTop - 24, behavior: 'smooth' });
  });
  render();
})();
