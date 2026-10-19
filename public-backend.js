(() => {
  const contentStatus = document.querySelector('#public-content-status');
  const newsGrid = document.querySelector('#public-news-grid');
  const programList = document.querySelector('#public-program-list');
  const galleryGrid = document.querySelector('#public-gallery-grid');

  function safeImageURL(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function setContentStatus(message, isError = false) {
    contentStatus.textContent = message;
    contentStatus.classList.toggle('is-error', isError);
  }

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderNews(items) {
    if (!items.length) return;
    newsGrid.replaceChildren();
    items.slice(0, 3).forEach((item, index) => {
      const article = create('article', `news-card${index === 0 ? ' news-featured' : ''}`);
      const imageLink = create('a', `news-image${index === 0 ? ' image-community' : ''}`);
      imageLink.href = 'index.html?page=berita';
      imageLink.setAttribute('aria-label', `Baca ${item.title}`);
      const imageUrl = safeImageURL(item.image_url);
      if (imageUrl) {
        const image = create('img', 'backend-content-image');
        image.src = imageUrl;
        image.alt = '';
        image.loading = 'lazy';
        imageLink.append(image);
      }
      imageLink.append(
        create('span', 'image-tag', item.category || 'INFORMASI'),
        create('span', 'image-arrow', '↗')
      );
      const date = item.published_at || item.created_at;
      const metadata = create('div', 'news-meta');
      metadata.append(create('span', '', new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      })));
      const heading = create('h3');
      const title = create('a', '', item.title);
      title.href = 'index.html?page=berita';
      heading.append(title);
      article.append(imageLink, metadata, heading, create('p', '', item.excerpt || item.content || ''));
      newsGrid.append(article);
    });
  }

  function renderPrograms(items) {
    if (!items.length) return;
    programList.replaceChildren();
    items.forEach((item, index) => {
      const row = create('article', 'program-item');
      row.append(
        create('span', 'program-number', String(index + 1).padStart(2, '0')),
        create('div'),
        create('span', 'program-symbol', '↗')
      );
      row.children[1].append(
        create('h3', '', item.title),
        create('p', '', item.description || `${item.status}${item.start_date ? ` · ${new Date(`${item.start_date}T00:00:00`).toLocaleDateString('id-ID')}` : ''}`)
      );
      programList.append(row);
    });
  }

  function renderGallery(items) {
    if (!items.length) return;
    galleryGrid.replaceChildren();
    items.slice(0, 12).forEach((item, index) => {
      const figure = create('figure', `gallery-photo gallery-${['one', 'two', 'three'][index % 3]}`);
      const imageUrl = safeImageURL(item.image_url);
      if (imageUrl) {
        const image = create('img', 'backend-content-image');
        image.src = imageUrl;
        image.alt = item.title;
        image.loading = 'lazy';
        figure.append(image);
      }
      const caption = create('figcaption');
      caption.append(
        create('span', '', `${String(index + 1).padStart(2, '0')} / ${(item.category || 'KEGIATAN').toLocaleUpperCase('id-ID')}`),
        create('strong', '', item.title)
      );
      figure.append(caption);
      galleryGrid.append(figure);
    });
  }

  function applySettings(settings) {
    const [domicile, email, whatsapp, instagram] = document.querySelectorAll('.contact-details > div');
    if (settings.domicile) domicile.querySelector('p').textContent = settings.domicile;
    if (settings.email) {
      const emailLink = email.querySelector('a');
      emailLink.textContent = settings.email;
      emailLink.href = `mailto:${settings.email}`;
    }
    if (settings.whatsapp) {
      const whatsappLink = whatsapp.querySelector('a');
      const digits = settings.whatsapp.replace(/\D/g, '');
      whatsappLink.textContent = `${settings.whatsapp} ↗`;
      whatsappLink.href = `https://wa.me/${digits}`;
    }
    if (settings.instagram) {
      const instagramLink = instagram.querySelector('a');
      const url = safeImageURL(settings.instagram);
      if (url) {
        instagramLink.href = url;
        instagramLink.textContent = `${new URL(url).hostname.replace(/^www\./, '')} ↗`;
      }
    }
    if (settings.organization_name) document.title = `${settings.organization_name} — Profil`;
  }

  async function loadPublicContent() {
    const errors = [];
    const [newsResult, programResult, galleryResult, settingsResult] = await Promise.all([
      hmssSupabase.from('hmss_news').select('title, category, excerpt, content, image_url, published_at, created_at').eq('published', true).order('created_at', { ascending: false }),
      hmssSupabase.from('hmss_programs').select('title, description, status, start_date').eq('published', true).order('created_at', { ascending: false }),
      hmssSupabase.from('hmss_gallery').select('title, category, image_url').eq('published', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      hmssSupabase.from('hmss_site_settings').select('organization_name, domicile, email, whatsapp, instagram').eq('id', true).maybeSingle()
    ]);
    if (newsResult.error) errors.push(`berita: ${newsResult.error.message}`);
    else renderNews(newsResult.data || []);
    if (programResult.error) errors.push(`program: ${programResult.error.message}`);
    else renderPrograms(programResult.data || []);
    if (galleryResult.error) errors.push(`galeri: ${galleryResult.error.message}`);
    else renderGallery(galleryResult.data || []);
    if (settingsResult.error) errors.push(`pengaturan: ${settingsResult.error.message}`);
    else if (settingsResult.data) applySettings(settingsResult.data);
    if (errors.length) {
      console.error('Sebagian konten HMSS gagal dimuat:', errors);
      setContentStatus(`Konten dinamis belum bisa dimuat (${errors.join('; ')}). Pastikan supabase-setup.sql sudah dijalankan.`, true);
    }
  }

  document.querySelector('#contact-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector('#contact-form-status');
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    button.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Mengirim pesan...';
    const { error } = await hmssSupabase.from('hmss_messages').insert({
      name: String(values.get('name')).trim(),
      email: String(values.get('email')).trim(),
      subject: String(values.get('subject')).trim(),
      message: String(values.get('message')).trim()
    });
    button.disabled = false;
    if (error) {
      status.classList.add('is-error');
      status.textContent = `Pesan gagal dikirim: ${error.message}. Coba kembali beberapa saat lagi.`;
      return;
    }
    form.reset();
    status.textContent = 'Pesan berhasil dikirim. Terima kasih telah menghubungi HMSS.';
  });

  loadPublicContent();
})();
