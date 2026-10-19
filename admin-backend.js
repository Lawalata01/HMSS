(() => {
  const manager = document.querySelector('#content-manager');
  const authPanel = document.querySelector('#leadership-auth');
  const dashboard = document.querySelector('#dashboard-view');
  const management = document.querySelector('#management-view');
  const authStatus = document.querySelector('#leadership-auth-status');
  const dashboardStatus = document.querySelector('#dashboard-status');

  const configurations = {
    berita: {
      table: 'hmss_news',
      title: 'Berita dan informasi',
      order: 'created_at',
      fields: [
        { name: 'title', label: 'Judul', required: true, max: 180 },
        { name: 'category', label: 'Kategori', required: true, max: 80 },
        { name: 'excerpt', label: 'Ringkasan', type: 'textarea', max: 500 },
        { name: 'content', label: 'Isi berita', type: 'textarea' },
        { name: 'image_url', label: 'URL gambar (opsional)', type: 'url' },
        { name: 'image_file', label: 'Unggah gambar (JPG, PNG, WebP; maks. 5 MB)', type: 'file' },
        { name: 'published', label: 'Tampilkan di website publik', type: 'checkbox', defaultValue: false }
      ]
    },
    program: {
      table: 'hmss_programs',
      title: 'Program kerja',
      order: 'created_at',
      fields: [
        { name: 'title', label: 'Nama program', required: true, max: 180 },
        { name: 'description', label: 'Deskripsi', type: 'textarea', max: 1000 },
        { name: 'status', label: 'Status', type: 'select', options: ['Rencana', 'Berjalan', 'Selesai'] },
        { name: 'start_date', label: 'Tanggal mulai', type: 'date' },
        { name: 'end_date', label: 'Tanggal selesai', type: 'date' },
        { name: 'published', label: 'Tampilkan di website publik', type: 'checkbox', defaultValue: true }
      ]
    },
    galeri: {
      table: 'hmss_gallery',
      title: 'Galeri kegiatan',
      order: 'sort_order',
      fields: [
        { name: 'title', label: 'Keterangan foto', required: true, max: 180 },
        { name: 'category', label: 'Kategori', required: true, max: 80 },
        { name: 'image_url', label: 'URL gambar (isi jika tidak mengunggah file)', type: 'url' },
        { name: 'image_file', label: 'Unggah foto (JPG, PNG, WebP; maks. 5 MB)', type: 'file' },
        { name: 'published', label: 'Tampilkan di website publik', type: 'checkbox', defaultValue: true },
        { name: 'sort_order', label: 'Urutan tampilan', type: 'number', defaultValue: 0 }
      ]
    },
    anggota: {
      table: 'hmss_members',
      title: 'Data anggota dan pendaftaran',
      order: 'created_at',
      fields: [
        { name: 'full_name', label: 'Nama lengkap', required: true, max: 100 },
        { name: 'university', label: 'Universitas', max: 150 },
        { name: 'study_program', label: 'Program studi', max: 150 },
        { name: 'cohort', label: 'Angkatan', type: 'number' },
        { name: 'whatsapp', label: 'Nomor WhatsApp', max: 30 },
        { name: 'reason', label: 'Alasan bergabung', type: 'textarea' },
        { name: 'status', label: 'Status pendaftaran', type: 'select', options: ['Menunggu', 'Diterima', 'Ditolak'] }
      ]
    },
    pesan: {
      table: 'hmss_messages',
      title: 'Pesan dari pengunjung',
      order: 'created_at',
      canCreate: false,
      fields: [
        { name: 'name', label: 'Nama pengirim', readonly: true },
        { name: 'email', label: 'Email', readonly: true },
        { name: 'subject', label: 'Subjek', readonly: true },
        { name: 'message', label: 'Isi pesan', type: 'textarea', readonly: true },
        { name: 'status', label: 'Status pesan', type: 'select', options: ['Baru', 'Ditindaklanjuti'] }
      ]
    },
    pengaturan: {
      table: 'hmss_site_settings',
      title: 'Pengaturan website',
      singleton: true,
      fields: [
        { name: 'organization_name', label: 'Nama organisasi', required: true },
        { name: 'description', label: 'Deskripsi organisasi', type: 'textarea' },
        { name: 'domicile', label: 'Domisili' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'whatsapp', label: 'Nomor WhatsApp' },
        { name: 'instagram', label: 'Tautan Instagram', type: 'url' }
      ]
    }
  };

  function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createField(field, value) {
    const label = element('label', '', field.label);
    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach((optionValue) => {
        const option = element('option', '', optionValue);
        option.value = optionValue;
        input.append(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      if (field.type === 'file') input.accept = 'image/jpeg,image/png,image/webp';
    }
    input.name = field.name;
    if (field.type === 'checkbox') {
      input.checked = Boolean(value ?? field.defaultValue);
    } else {
      input.value = value ?? field.defaultValue ?? '';
    }
    if (field.required) input.required = true;
    if (field.max) input.maxLength = field.max;
    if (field.readonly) input.readOnly = true;
    label.append(input);
    return label;
  }

  function getPayload(form, config) {
    const payload = {};
    config.fields.forEach((field) => {
      if (field.readonly || field.type === 'file') return;
      const control = form.elements[field.name];
      if (field.type === 'checkbox') payload[field.name] = control.checked;
      else if (field.type === 'number') payload[field.name] = control.value ? Number(control.value) : null;
      else payload[field.name] = control.value.trim();
    });
    return payload;
  }

  async function uploadImage(file) {
    if (!file?.name) return null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error('Gambar harus berupa JPG, PNG, atau WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.');
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `content/${id}.${extension}`;
    const { error } = await hmssSupabase.storage.from('hmss-organization').upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    return {
      path,
      url: hmssSupabase.storage.from('hmss-organization').getPublicUrl(path).data.publicUrl
    };
  }

  function renderForm(config, record, parent) {
    const form = element('form', 'backend-record-form');
    if (record?.id) form.dataset.recordId = record.id;
    if (config.singleton) form.dataset.singleton = 'true';
    config.fields.forEach((field) => form.append(createField(field, record?.[field.name])));
    const actions = element('div', 'backend-record-actions');
    const save = element('button', 'admin-action primary', record ? 'Simpan perubahan' : 'Tambah data');
    save.type = 'submit';
    actions.append(save);
    if (record && !config.singleton && config.canCreate !== false) {
      const remove = element('button', 'admin-action danger', 'Hapus');
      remove.type = 'button';
      remove.dataset.deleteRecord = record.id;
      actions.append(remove);
    } else if (record && !config.singleton && config.canCreate === false) {
      const remove = element('button', 'admin-action danger', 'Hapus pesan');
      remove.type = 'button';
      remove.dataset.deleteRecord = record.id;
      actions.append(remove);
    }
    form.append(actions);
    parent.append(form);
    return form;
  }

  function renderRecords(config, records, list) {
    list.replaceChildren();
    if (!records.length) {
      list.append(element('p', 'leadership-help', 'Belum ada data. Tambahkan data menggunakan formulir di atas.'));
      return;
    }
    records.forEach((record) => {
      const card = element('article', 'backend-record-card');
      const heading = element('h3', '', record.title || record.full_name || record.name || config.title);
      card.append(heading);
      if (record.created_at) {
        card.append(element('p', 'backend-record-date', new Date(record.created_at).toLocaleString('id-ID')));
      }
      renderForm(config, record, card);
      list.append(card);
    });
  }

  async function loadManager(view) {
    const config = configurations[view];
    if (!config) return;
    manager.hidden = false;
    manager.replaceChildren();
    const panel = element('section', 'admin-panel');
    panel.append(element('h2', '', config.title));
    const status = element('p', 'leadership-status');
    const createForm = config.canCreate === false || config.singleton ? null : renderForm(config, null, panel);
    if (createForm) {
      createForm.classList.add('backend-create-form');
      createForm.prepend(element('h3', '', `Tambah ${config.title.toLocaleLowerCase()}`));
    } else if (config.singleton) {
      panel.append(element('p', 'leadership-help', 'Perubahan di sini akan langsung diperbarui pada website publik.'));
    }
    const list = element('div', 'backend-record-list');
    panel.append(list, status);
    manager.append(panel);
    setStatus(status, 'Memuat data...', false);

    let query = hmssSupabase.from(config.table).select('*');
    if (!config.singleton) query = query.order(config.order, { ascending: false });
    const { data, error } = await query;
    if (error) {
      setStatus(status, `Data gagal dimuat: ${error.message}. Pastikan supabase-setup.sql sudah dijalankan.`, true);
      return;
    }
    const records = config.singleton ? (data.length ? data : [{ id: true }]) : data;
    if (config.singleton) {
      list.hidden = true;
      const form = renderForm(config, records[0], panel);
      form.dataset.singleton = 'true';
    } else {
      renderRecords(config, records, list);
    }
    setStatus(status, records.length ? `Menampilkan ${config.singleton ? 'pengaturan website' : `${records.length} data`}.` : 'Belum ada data.', false);

    manager.onsubmit = async (event) => {
      const form = event.target.closest('.backend-record-form');
      if (!form) return;
      event.preventDefault();
      const payload = getPayload(form, config);
      const imageInput = form.elements.image_file;
      if (config.table === 'hmss_gallery' && !payload.image_url && !imageInput?.files?.[0]) {
        setStatus(status, 'Pilih foto atau masukkan URL gambar untuk item galeri.', true);
        return;
      }
      let uploadedImage = null;
      let result;
      try {
        if (imageInput?.files?.[0]) {
          uploadedImage = await uploadImage(imageInput.files[0]);
          payload.image_url = uploadedImage.url;
        }
        if (config.singleton) {
          result = await hmssSupabase.from(config.table).upsert({ id: true, ...payload }).select().single();
        } else if (form.dataset.recordId) {
          result = await hmssSupabase.from(config.table).update(payload).eq('id', form.dataset.recordId);
        } else {
          result = await hmssSupabase.from(config.table).insert(payload);
        }
      } catch (error) {
        if (uploadedImage) {
          const { error: cleanupError } = await hmssSupabase.storage.from('hmss-organization').remove([uploadedImage.path]);
          if (cleanupError) {
            setStatus(status, `Data gagal disimpan: ${error.message}. Gambar sementara juga gagal dibersihkan: ${cleanupError.message}`, true);
            return;
          }
        }
        setStatus(status, `Data gagal disimpan: ${error.message}`, true);
        return;
      }
      if (result.error) {
        if (uploadedImage) {
          const { error: cleanupError } = await hmssSupabase.storage.from('hmss-organization').remove([uploadedImage.path]);
          if (cleanupError) {
            setStatus(status, `Data gagal disimpan: ${result.error.message}. Gambar sementara juga gagal dibersihkan: ${cleanupError.message}`, true);
            return;
          }
        }
        setStatus(status, `Data gagal disimpan: ${result.error.message}`, true);
        return;
      }
      await loadManager(view);
      await loadDashboard();
    };

    manager.onclick = async (event) => {
      const button = event.target.closest('[data-delete-record]');
      if (!button || !window.confirm('Hapus data ini secara permanen?')) return;
      const { error: deleteError } = await hmssSupabase.from(config.table).delete().eq('id', button.dataset.deleteRecord);
      if (deleteError) {
        setStatus(status, `Data gagal dihapus: ${deleteError.message}`, true);
        return;
      }
      await loadManager(view);
      await loadDashboard();
    };
  }

  async function loadDashboard() {
    setStatus(dashboardStatus, '', false);
    for (const [table, selector] of [
      ['hmss_news', '[data-count="hmss_news"]'],
      ['hmss_programs', '[data-count="hmss_programs"]'],
      ['hmss_members', '[data-count="hmss_members"]']
    ]) {
      const { count, error } = await hmssSupabase.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        setStatus(dashboardStatus, `Ringkasan ${table} gagal dimuat: ${error.message}`, true);
        continue;
      }
      document.querySelector(selector).textContent = String(count ?? 0);
    }
    const { count: newMessages, error: messageCountError } = await hmssSupabase
      .from('hmss_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Baru');
    if (messageCountError) setStatus(dashboardStatus, `Jumlah pesan gagal dimuat: ${messageCountError.message}`, true);
    else document.querySelector('[data-count="hmss_messages"]').textContent = String(newMessages ?? 0);

    const { data: news, error: newsError } = await hmssSupabase
      .from('hmss_news').select('title, category, published, created_at').order('created_at', { ascending: false }).limit(5);
    if (newsError) setStatus(dashboardStatus, `Berita dashboard gagal dimuat: ${newsError.message}`, true);
    else {
      const newsBody = document.querySelector('#admin-latest-news');
      newsBody.replaceChildren();
      news.forEach((item) => {
        const row = document.createElement('tr');
        row.append(
          element('td', 'table-title', item.title),
          element('td', '', item.category),
          element('td', '', new Date(item.created_at).toLocaleDateString('id-ID'))
        );
        const statusCell = element('td');
        statusCell.append(element('span', item.published ? 'status' : 'status pending', item.published ? 'Terbit' : 'Konsep'));
        row.append(statusCell);
        newsBody.append(row);
      });
      if (!news.length) {
        const row = document.createElement('tr');
        const cell = element('td', '', 'Belum ada berita.');
        cell.colSpan = 4;
        row.append(cell);
        newsBody.append(row);
      }
    }
    const { data: messages, error: messagesError } = await hmssSupabase
      .from('hmss_messages').select('name, subject, created_at').order('created_at', { ascending: false }).limit(5);
    if (messagesError) setStatus(dashboardStatus, `Pesan dashboard gagal dimuat: ${messagesError.message}`, true);
    else {
      const list = document.querySelector('#admin-recent-messages');
      list.replaceChildren();
      messages.forEach((message) => {
        const row = element('div', 'activity');
        row.append(element('span', 'activity-icon', '✉'));
        const description = element('p');
        description.append(element('strong', '', message.subject || 'Pesan masuk'));
        description.append(document.createTextNode(` dari ${message.name}`));
        description.append(element('small', '', new Date(message.created_at).toLocaleString('id-ID')));
        row.append(description);
        list.append(row);
      });
      if (!messages.length) list.append(element('p', 'leadership-help', 'Belum ada pesan masuk.'));
    }
  }

  function showLogin() {
    authPanel.hidden = false;
    dashboard.hidden = true;
    management.hidden = true;
    manager.hidden = true;
    setStatus(authStatus, 'Masuk menggunakan akun admin Supabase yang terdaftar.', false);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-view]');
    if (!link) return;
    if (!window.hmssAdminAuthorized) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showLogin();
      return;
    }
    if (link.dataset.view === 'dashboard') {
      manager.hidden = true;
      window.setTimeout(loadDashboard, 0);
      return;
    }
    if (link.dataset.view === 'kepengurusan') {
      manager.hidden = true;
      return;
    }
    window.setTimeout(() => loadManager(link.dataset.view), 0);
  }, true);

  window.addEventListener('hmss-admin-authorized', async () => {
    authPanel.hidden = true;
    dashboard.hidden = false;
    management.hidden = true;
    document.querySelector('#admin-date').textContent = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    await loadDashboard();
    const requestedView = window.location.hash.slice(1);
    const link = document.querySelector(`[data-view="${CSS.escape(requestedView)}"]`);
    if (link && requestedView !== 'dashboard') link.click();
  });

  window.addEventListener('hmss-admin-unauthorized', showLogin);

  if (window.hmssAdminAuthorized) {
    window.dispatchEvent(new Event('hmss-admin-authorized'));
  } else {
    showLogin();
  }
})();
