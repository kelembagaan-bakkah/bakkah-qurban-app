const API_URL = 'https://script.google.com/macros/s/AKfycbzIek6qAuyDTapYx4IzmVxDqYJdeF0wxUB1pQuOuqlsETUYnv2ZOe0GrTn0Bt1mKCkZ4A/exec';

function callApi(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `qurbanApiCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const url = new URL(API_URL);

    url.searchParams.set('action', action);
    url.searchParams.set('payload', JSON.stringify(payload));
    url.searchParams.set('callback', callbackName);
    url.searchParams.set('_', Date.now().toString());

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (response) => {
      cleanup();

      if (!response || response.success === false) {
        reject(new Error(response && response.error ? response.error : 'Request gagal.'));
        return;
      }

      resolve(response.data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Tidak bisa terhubung ke Apps Script API.'));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function qurbanApp() {
  return {
    loading: false,
    saving: false,
    hasLoaded: false,
    loadingMessage: 'Memuat data...',
    savingMessage: 'Menyimpan data...',
    tab: 'dashboard',
    mobileMenuOpen: false,
    currentUser: null,
    dateLabel: '',
    timeLabel: '',
    clockTimer: null,
    toast: { type: 'success', message: '' },
    tabs: [
      { key: 'dashboard', label: 'Beranda', mobileLabel: 'Home', icon: 'layout-dashboard', roles: ['Public', 'Admin', 'RPH', 'Developer'], bottomRoles: ['Admin', 'RPH'] },
      { key: 'admin-hewan', label: 'Hewan', icon: 'badge-plus', roles: ['Admin', 'Developer'], bottomRoles: ['Admin'] },
      { key: 'admin-kupon', label: 'Kupon', icon: 'ticket', roles: ['Admin', 'Developer'], bottomRoles: ['Admin'] },
      { key: 'rph-sembelihan', label: 'Sembelihan', icon: 'list-checks', roles: ['RPH', 'Developer'], bottomRoles: ['RPH'] },
      { key: 'rph-pengiriman', label: 'Pengiriman', icon: 'truck', roles: ['RPH', 'Developer'], bottomRoles: ['RPH'] },
      { key: 'pondok-penerimaan', label: 'Penerimaan', mobileLabel: 'Terima', icon: 'package-check', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'pondok-masuk', label: 'D. Masuk', icon: 'archive-restore', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'pondok-keluar', label: 'D. Keluar', icon: 'archive-x', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'account', label: 'Akun', icon: 'circle-user-round', roles: ['Admin', 'RPH', 'Pondok', 'Developer'], bottomRoles: ['Admin', 'RPH', 'Pondok'] },
    ],
    partFields: [
      { key: 'kepala', label: 'Qty Kepala' },
      { key: 'kaki', label: 'Qty Kaki' },
      { key: 'paha', label: 'Qty Paha' },
      { key: 'hati', label: 'Qty Hati' },
      { key: 'jantung', label: 'Qty Jantung' },
      { key: 'buntut', label: 'Qty Buntut' },
      { key: 'badan', label: 'Qty Badan' },
    ],
    dagingFields: [
      { key: 'kecil', label: 'Bungkusan Kecil' },
      { key: 'besar', label: 'Bungkusan Besar' },
      { key: 'kepala', label: 'Kepala' },
      { key: 'kaki', label: 'Kaki' },
      { key: 'buntut', label: 'Buntut' },
    ],
    hewan: [],
    hewanSelesai: [],
    pengirimanBelumDiterima: [],
    dashboard: {
      totalHewan: 0,
      totalSelesai: 0,
      totalPending: 0,
      totalPengiriman: 0,
      masuk: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 },
      keluar: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 },
    },
    forms: {
      hewan: { jenis: 'Sapi', qty: 1 },
      kupon: { jenis: 'Besar', qty: 1 },
      pengiriman: { idHewan: '', kepala: 0, kaki: 0, paha: 0, hati: 0, jantung: 0, buntut: 0, badan: 0 },
      masuk: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 },
      keluar: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 },
      login: { username: '', password: '', remember: true },
    },
    init() {
      this.currentUser = this.loadSession();
      this.updateClock();
      this.clockTimer = setInterval(() => this.updateClock(), 30000);
      this.startAutoRefresh();
      this.refresh();
      this.syncIcons();
      this.registerSW();
    },
    autoRefreshTimer: null,
    startAutoRefresh() {
      this.stopAutoRefresh();
      // Auto-refresh every 60 seconds, only for public (non-logged-in) users
      if (!this.isLoggedIn()) {
        this.autoRefreshTimer = setInterval(() => {
          this.silentRefresh();
        }, 60000);
      }
    },
    stopAutoRefresh() {
      if (this.autoRefreshTimer) {
        clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = null;
      }
    },
    async silentRefresh() {
      try {
        const data = await callApi('getAppData');
        this.applyData(data);
        this.hasLoaded = true;
      } catch (error) {
        // Silently ignore errors to keep UI smooth
        console.warn('Silent refresh failed:', error);
      }
    },
    registerSW() {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(
            (reg) => {
              console.log('SW registered:', reg.scope);
              reg.addEventListener('updatefound', () => {
                const installing = reg.installing;
                if (installing) {
                  installing.addEventListener('statechange', () => {
                    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                      this.toast = { type: 'success', message: 'Aplikasi siap digunakan offline.' };
                    }
                  });
                }
              });
            },
            (err) => {
              console.warn('SW registration failed:', err);
            }
          );
        });
      }
    },
    syncIcons() {
      setTimeout(() => {
        if (window.lucide) window.lucide.createIcons();
      }, 0);
    },
    busyMessage() {
      if (this.saving) return this.savingMessage;
      if (this.loading) return this.loadingMessage;
      return 'Memproses...';
    },
    loadSession() {
      try {
        return JSON.parse(localStorage.getItem('qurbanUser') || sessionStorage.getItem('qurbanUser') || 'null');
      } catch (error) {
        return null;
      }
    },
    isLoggedIn() {
      return Boolean(this.currentUser && this.currentUser.role);
    },
    visibleTabs() {
      const role = this.isLoggedIn() ? this.currentUser.role : 'Public';
      return this.tabs.filter((item) => item.roles.includes(role));
    },
    menuTabs() {
      return this.visibleTabs();
    },
    bottomTabs() {
      if (!this.isLoggedIn() || this.currentUser.role === 'Developer') return [];
      const role = this.currentUser.role;
      return this.tabs.filter((item) => item.bottomRoles && item.bottomRoles.includes(role));
    },
    canAccess(tabKey) {
      return this.visibleTabs().some((item) => item.key === tabKey);
    },
    setTab(tabKey) {
      if (!this.canAccess(tabKey)) {
        this.openLogin();
        return;
      }

      this.tab = tabKey;
      this.mobileMenuOpen = false;
      this.syncIcons();
    },
    openLogin() {
      this.tab = 'login';
      this.mobileMenuOpen = false;
      this.syncIcons();
    },
    logout() {
      this.currentUser = null;
      localStorage.removeItem('qurbanUser');
      sessionStorage.removeItem('qurbanUser');
      this.tab = 'dashboard';
      this.mobileMenuOpen = false;
      this.toast = { type: 'success', message: 'Anda sudah logout.' };
      this.startAutoRefresh(); // Mulai silent refresh lagi untuk public
      this.syncIcons();
    },
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      this.syncIcons();
    },
    defaultTabForRole(role) {
      const defaults = {
        Admin: 'dashboard',
        RPH: 'dashboard',
        Pondok: 'pondok-penerimaan',
        Developer: 'dashboard',
      };

      return defaults[role] || 'dashboard';
    },
    updateClock() {
      const now = new Date();
      this.dateLabel = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(now);
      this.timeLabel = `${new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).format(now)}`;
    },
    async refresh() {
      this.loading = true;
      this.loadingMessage = this.hasLoaded ? 'Memperbarui data...' : 'Memuat data...';

      try {
        const data = await callApi('getAppData');
        this.applyData(data);
        this.hasLoaded = true;
        if (this.tab !== 'login' && !this.canAccess(this.tab)) {
          this.tab = this.isLoggedIn() ? this.defaultTabForRole(this.currentUser.role) : 'dashboard';
        }
      } catch (error) {
        this.hasLoaded = true;
        this.fail(error);
      } finally {
        this.loading = false;
        this.syncIcons();
      }
    },
    applyData(data) {
      this.hewan = data.hewan || [];
      this.hewanSelesai = data.hewanSelesai || [];
      this.pengirimanBelumDiterima = data.pengirimanBelumDiterima || [];
      this.dashboard = data.dashboard || this.dashboard;
    },
    stockItems(stock) {
      return [
        { label: 'Bungkusan Kecil', value: stock.kecil || 0 },
        { label: 'Bungkusan Besar', value: stock.besar || 0 },
        { label: 'Kepala', value: stock.kepala || 0 },
        { label: 'Kaki', value: stock.kaki || 0 },
        { label: 'Buntut', value: stock.buntut || 0 },
      ];
    },
    formatNumber(value) {
      return new Intl.NumberFormat('id-ID').format(Number(value || 0));
    },
    packageTotal(stock) {
      return Number(stock.kecil || 0) + Number(stock.besar || 0);
    },
    availablePackages() {
      return Math.max(this.packageTotal(this.dashboard.masuk) - this.packageTotal(this.dashboard.keluar), 0);
    },
    partTotal(key) {
      return Math.max(Number(this.dashboard.masuk[key] || 0) - Number(this.dashboard.keluar[key] || 0), 0);
    },
    animalGroups() {
      return ['Sapi', 'Kambing'].map((jenis) => {
        const items = this.hewan
          .filter((item) => item.Jenis === jenis)
          .sort((a, b) => this.animalNumber(a) - this.animalNumber(b));
        const done = items.filter((item) => item['Status Sembelihan'] === 'SELESAI').length;

        return {
          jenis,
          items,
          done,
          pending: items.length - done,
        };
      }).filter((group) => group.items.length > 0);
    },
    animalTypeStats() {
      return ['Sapi', 'Kambing'].map((jenis) => {
        const items = this.hewan.filter((item) => item.Jenis === jenis);
        const done = items.filter((item) => item['Status Sembelihan'] === 'SELESAI').length;

        return {
          jenis,
          total: items.length,
          done,
          pending: items.length - done,
        };
      });
    },
    animalNumber(item) {
      const descriptionMatch = String(item.Deskripsi || '').match(/(\d+)$/);
      if (descriptionMatch) return Number(descriptionMatch[1]);

      const idMatch = String(item.ID || '').match(/(\d+)$/);
      return idMatch ? Number(idMatch[1]) : 0;
    },
    animalRangeText(group) {
      if (!group.items.length) return '(0)';
      const numbers = group.items.map((item) => this.animalNumber(item)).filter((number) => number > 0);
      if (!numbers.length) return `(${group.items.length})`;
      return `(1 - ${Math.max(...numbers)})`;
    },
    rawPercent(value) {
      const total = Number(this.dashboard.totalHewan || 0);
      if (!total) return 0;
      return Math.round((Number(value || 0) / total) * 100);
    },
    dashboardPercent(value) {
      const total = Number(this.dashboard.totalHewan || 0);
      if (!total) return '0%';
      return `${((Number(value || 0) / total) * 100).toFixed(1).replace('.', ',')}%`;
    },
    submitHewan() {
      this.runSave('registerHewan', this.forms.hewan, () => {
        this.forms.hewan.qty = 1;
      });
    },
    submitKupon() {
      this.runSave('inputKupon', this.forms.kupon, () => {
        this.forms.kupon.qty = 1;
      });
    },
    async submitLogin() {
      this.saving = true;
      this.savingMessage = 'Memeriksa akses pengguna...';

      try {
        const user = await callApi('login', this.forms.login);
        this.currentUser = user;
        this.stopAutoRefresh(); // Silent refresh tidak diperlukan untuk user yang login
        const storage = this.forms.login.remember ? localStorage : sessionStorage;
        localStorage.removeItem('qurbanUser');
        sessionStorage.removeItem('qurbanUser');
        storage.setItem('qurbanUser', JSON.stringify(user));
        this.forms.login = { username: '', password: '', remember: true };
        this.toast = { type: 'success', message: `Selamat datang, ${user.name}.` };
        this.tab = this.defaultTabForRole(user.role);
        this.mobileMenuOpen = false;
        this.syncIcons();
      } catch (error) {
        this.fail(error);
      } finally {
        this.saving = false;
      }
    },
    toggleStatus(item) {
      const nextStatus = item['Status Sembelihan'] === 'SELESAI' ? 'PENDING' : 'SELESAI';
      this.runSave('updateStatusSembelihan', { id: item.ID, status: nextStatus });
    },
    submitPengiriman() {
      this.runSave('createPengiriman', this.forms.pengiriman, () => {
        this.forms.pengiriman = { idHewan: '', kepala: 0, kaki: 0, paha: 0, hati: 0, jantung: 0, buntut: 0, badan: 0 };
      });
    },
    terimaPengiriman(idPengiriman) {
      this.runSave('receivePengiriman', { idPengiriman });
    },
    submitDaging(type) {
      const fn = type === 'masuk' ? 'inputDagingMasuk' : 'inputDagingKeluar';
      this.runSave(fn, this.forms[type], () => {
        this.forms[type] = { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 };
      });
    },
    async runSave(fnName, payload, afterSuccess) {
      this.saving = true;
      this.savingMessage = this.saveMessageFor(fnName);

      try {
        const result = await callApi(fnName, payload);
        this.toast = { type: 'success', message: result.message || 'Data berhasil disimpan.' };
        if (afterSuccess) afterSuccess();
        await this.refresh();
      } catch (error) {
        this.fail(error);
      } finally {
        this.saving = false;
      }
    },
    fail(error) {
      this.loading = false;
      this.saving = false;
      this.toast = { type: 'error', message: error && error.message ? error.message : 'Terjadi kesalahan.' };
    },
    saveMessageFor(fnName) {
      const messages = {
        registerHewan: 'Mendaftarkan data hewan...',
        inputKupon: 'Menyimpan data kupon...',
        updateStatusSembelihan: 'Mengubah status sembelihan...',
        createPengiriman: 'Mencatat pengiriman daging...',
        receivePengiriman: 'Mengonfirmasi penerimaan pengiriman...',
        inputDagingMasuk: 'Menyimpan data daging masuk...',
        inputDagingKeluar: 'Menyimpan data daging keluar...',
      };

      return messages[fnName] || 'Menyimpan data...';
    },
  };
}
