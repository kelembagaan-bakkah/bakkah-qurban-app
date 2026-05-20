const APP_VERSION = '1.0.8';
const API_URL = 'https://script.google.com/a/macros/bakkah.sch.id/s/AKfycbzIek6qAuyDTapYx4IzmVxDqYJdeF0wxUB1pQuOuqlsETUYnv2ZOe0GrTn0Bt1mKCkZ4A/exec';
const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 hari
const SESSION_KEY = 'user_session';

// ── API Cache ──
const CACHE_KEY = 'qurbanApiCache';
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts >= CACHE_TTL) return null;
    return cached.data;
  } catch { return null; }
}

function setCached(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// ── API Throttle ──
let refreshInFlight = false;

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
    successModal: { show: false, title: '', message: '' },
    successModalTimer: null,
    confirmModal: { show: false, title: '', message: '', onConfirm: null },
    sembelihanModal: {
      show: false,
      itemId: '',
      itemDesc: '',
      nextStatus: '',
    },
    sembelihanFilter: 'semua',
    sembelihanQuery: '',
    activePanel: {
      kupon: 'besar',
      pengiriman: 'form',
      penerimaan: 'pending',
      masuk: 'input',
      keluar: 'input',
    },
    penerimaanExpanded: {},
    penerimaanConfirm: { show: false, item: null },
    riwayatPengiriman: [],
    riwayatMasuk: [],
    riwayatKeluar: [],
    riwayatPenerimaan: [],
    tabs: [
      { key: 'dashboard', label: 'Beranda', mobileLabel: 'Home', icon: 'layout-dashboard', roles: ['Public', 'Admin', 'RPH', 'Pondok', 'Developer'], bottomRoles: ['Admin', 'RPH', 'Pondok'] },
      { key: 'admin-hewan', label: 'Hewan', icon: 'badge-plus', roles: ['Admin', 'Developer'], bottomRoles: ['Admin'] },
      { key: 'admin-kupon', label: 'Kupon', icon: 'ticket', roles: ['Admin', 'Pondok', 'Developer'], bottomRoles: ['Admin', 'Pondok'] },
      { key: 'rph-sembelihan', label: 'Sembelihan', icon: 'list-checks', roles: ['RPH', 'Developer'], bottomRoles: ['RPH'] },
      { key: 'rph-pengiriman', label: 'Pengiriman', icon: 'truck', roles: ['RPH', 'Developer'], bottomRoles: ['RPH'] },
      { key: 'pondok-penerimaan', label: 'Penerimaan', mobileLabel: 'Terima', icon: 'package-check', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'pondok-masuk', label: 'D. Masuk', icon: 'archive-restore', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'pondok-keluar', label: 'D. Keluar', icon: 'archive-x', roles: ['Pondok', 'Developer'], bottomRoles: ['Pondok'] },
      { key: 'account', label: 'Akun', icon: 'circle-user-round', roles: ['Admin', 'RPH', 'Pondok', 'Developer'], bottomRoles: [] },
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
    kupon: [],
    kuponBesar: [],
    kuponBesarFilter: 'semua',
    kuponBesarQuery: '',
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
      hewan: { jenis: 'Sapi', qty: 1, _submitting: false },
      kupon: { jenis: 'Kecil', qty: 1, _submitting: false },
      pengiriman: { idHewan: '', kepala: 0, kaki: 0, paha: 0, hati: 0, jantung: 0, buntut: 0, badan: 0, catatan: '', _submitting: false },
      masuk: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0, _submitting: false },
      keluar: { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0, _submitting: false },
      login: { username: '', password: '', remember: true },
    },
    init() {
      // Auto-detect version update
      const savedVersion = localStorage.getItem('app_version');
      if (savedVersion !== APP_VERSION) {
        console.log('Versi baru terdeteksi:', APP_VERSION);
        // Clear all localStorage except app_version and preserved session
        const preservedSession = localStorage.getItem(SESSION_KEY);
        localStorage.clear();
        if (preservedSession) {
          localStorage.setItem(SESSION_KEY, preservedSession);
        }
        // Delete all caches
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        localStorage.setItem('app_version', APP_VERSION);
        window.location.reload(true);
        return;
      } else {
        localStorage.setItem('app_version', APP_VERSION);
      }

      this.currentUser = this.loadSession();
      this.updateClock();
      this.clockTimer = setInterval(() => this.updateClock(), 30000);
      this.startAutoRefresh();
      this.registerSW();

      const cached = getCached();
      if (cached) {
        this.applyData(cached);
        this.hasLoaded = true;
        this.syncIcons();
        this.silentRefreshData();
      } else {
        this.refresh();
      }
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
    async silentRefreshData() {
      try {
        const data = await callApi('getAppData');
        setCached(data);
        this.applyData(data);
      } catch (error) {
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
    getStoredSession() {
      try {
        const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || localStorage.getItem('qurbanUser') || sessionStorage.getItem('qurbanUser');
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session || !session.loginTime) return session;

        if (Date.now() - session.loginTime >= MAX_SESSION_AGE) {
          this.removeSession();
          return null;
        }

        return session;
      } catch (error) {
        return null;
      }
    },
    saveSession(user, remember) {
      try {
        const session = {
          ...user,
          loginTime: Date.now(),
        };
        if (remember) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          sessionStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('qurbanUser');
          sessionStorage.removeItem('qurbanUser');
        } else {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('qurbanUser');
          sessionStorage.removeItem('qurbanUser');
        }
      } catch (error) {
        console.warn('Gagal menyimpan session:', error);
      }
    },
    removeSession() {
      try {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('qurbanUser');
        sessionStorage.removeItem('qurbanUser');
      } catch (error) {
        console.warn('Gagal menghapus session:', error);
      }
    },
    loadSession() {
      return this.getStoredSession();
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
    setPanelMode(section, mode) {
      if (!this.activePanel) return;
      this.activePanel[section] = mode;
      this.syncIcons();
    },
    isPanelMode(section, mode) {
      return this.activePanel && this.activePanel[section] === mode;
    },
    updateNumber(formKey, fieldKey, delta) {
      const current = Number(this.forms[formKey]?.[fieldKey] || 0);
      const next = Math.max(0, current + Number(delta));
      this.forms[formKey][fieldKey] = next;
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
      this.removeSession();
      this.tab = 'dashboard';
      this.mobileMenuOpen = false;
      this.toast = { type: 'success', message: 'Anda sudah logout.' };
      this.startAutoRefresh(); // Mulai silent refresh lagi untuk public
      this.syncIcons();
    },
    async clearAppCache() {
      this.saving = true;
      this.savingMessage = 'Membersihkan cache...';

      try {
        // Clear localStorage
        localStorage.clear();
        localStorage.setItem('app_version', APP_VERSION);

        // Delete all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }

        // Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // Force reload
        window.location.reload(true);
      } catch (error) {
        this.toast = { type: 'error', message: error?.message || 'Gagal membersihkan cache.' };
        this.saving = false;
      }
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
      // Safety: reset stuck flag after 8 detik
      if (this._refreshPending) {
        if (!this._refreshTimer) {
          this._refreshTimer = setTimeout(() => {
            this._refreshPending = false;
            this._refreshTimer = null;
          }, 8000);
        }
        return;
      }
      this._refreshPending = true;

      // Show cached data immediately (no loading screen)
      const cached = getCached();
      if (cached && !this.hasLoaded) {
        this.applyData(cached);
        this.hasLoaded = true;
        this.syncIcons();
      }

      this.loading = true;
      this.loadingMessage = this.hasLoaded ? 'Memperbarui data...' : 'Memuat data...';

      try {
        const data = await callApi('getAppData');
        setCached(data);
        this.applyData(data);
        this.hasLoaded = true;
        if (this.tab !== 'login' && !this.canAccess(this.tab)) {
          this.tab = this.isLoggedIn() ? this.defaultTabForRole(this.currentUser.role) : 'dashboard';
        }
      } catch (error) {
        if (!this.hasLoaded) {
          this.hasLoaded = true;
          this.fail(error);
        } else {
          this.toast = { type: 'error', message: error?.message || 'Gagal refresh data.' };
        }
      } finally {
        this.loading = false;
        this._refreshPending = false;
        if (this._refreshTimer) {
          clearTimeout(this._refreshTimer);
          this._refreshTimer = null;
        }
        this.syncIcons();
      }
    },
    applyData(data) {
      this.hewan = data.hewan || [];
      this.kupon = data.kupon || [];
      this.kuponBesar = data.kuponBesar || [];
      this.hewanSelesai = data.hewanSelesai || [];
      this.pengirimanBelumDiterima = data.pengirimanBelumDiterima || [];
      this.riwayatPengiriman = data.riwayatPengiriman || [];
      this.riwayatMasuk = data.riwayatMasuk || [];
      this.riwayatKeluar = data.riwayatKeluar || [];
      this.riwayatPenerimaan = data.riwayatPenerimaan || [];
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
    packageBreakdown(stock) {
      return {
        besar: Number(stock.besar || 0),
        kecil: Number(stock.kecil || 0),
      };
    },
    availablePackageBreakdown() {
      return {
        besar: Number(this.dashboard.masuk.besar || 0) - Number(this.dashboard.keluar.besar || 0),
        kecil: Number(this.dashboard.masuk.kecil || 0) - Number(this.dashboard.keluar.kecil || 0),
      };
    },
    kuponCount(jenis) {
      return this.kupon
        .filter((item) => String(item['Jenis Kupon'] || item.Jenis || '').toLowerCase() === String(jenis).toLowerCase())
        .reduce((sum, item) => sum + Number(item.Qty || item.qty || 0), 0);
    },
    availablePackages() {
      return this.packageTotal(this.dashboard.masuk) - this.packageTotal(this.dashboard.keluar);
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
    get filteredSembelihan() {
      const query = (this.sembelihanQuery || '').toLowerCase().trim();
      return this.hewan.filter((item) => {
        // Filter by jenis
        if (this.sembelihanFilter !== 'semua' && item.Jenis !== this.sembelihanFilter) return false;
        // Search by ID or description
        if (query) {
          const desc = (item.Deskripsi || '').toLowerCase();
          const id = String(item.ID || '');
          if (!desc.includes(query) && !id.includes(query)) return false;
        }
        return true;
      });
    },
    submitHewan() {
      if (this.forms.hewan._submitting) return;
      const formData = { jenis: this.forms.hewan.jenis, qty: this.forms.hewan.qty };

      this.forms.hewan._submitting = true;

      callApi('registerHewan', formData)
        .then((result) => {
          this.forms.hewan = { jenis: 'Sapi', qty: 1, _submitting: false };
          this.showSuccessModal(
            'Hewan Berhasil Disimpan',
            result?.message || `${formData.qty} ${formData.jenis} berhasil didaftarkan ke sistem.`
          );
          this.silentRefreshData();
        })
        .catch((error) => {
          this.forms.hewan = { ...formData, _submitting: false };
          this.toast = { type: 'error', message: error?.message || 'Gagal mendaftarkan hewan. Coba lagi.' };
        });
    },
    submitKupon() {
      if (this.forms.kupon._submitting) return;
      const formData = { jenis: this.forms.kupon.jenis, qty: this.forms.kupon.qty };

      this.forms.kupon._submitting = true;

      callApi('inputKupon', formData)
        .then(() => {
          this.forms.kupon = { jenis: 'Kecil', qty: 1, _submitting: false };
          this.showSuccessModal(
            'Kupon Berhasil Disimpan',
            `${formData.qty} kupon ${formData.jenis} berhasil dicatat.`
          );
        })
        .catch((error) => {
          this.forms.kupon = { ...formData, _submitting: false };
          this.toast = { type: 'error', message: error?.message || 'Gagal menyimpan kupon. Coba lagi.' };
        });
    },
    async selesaiKuponBesar(item) {
      if (this.saving) return;
      const id = item.ID;
      const prevStatus = item['Status Pengambilan'];
      const nextStatus = prevStatus === 'Selesai' ? 'Pending' : 'Selesai';

      const applyChange = async () => {
        // Optimistic update
        item['Status Pengambilan'] = nextStatus;

        try {
          await callApi('updateStatusKuponBesar', { id, status: nextStatus });
          this.toast = {
            type: 'success',
            message: nextStatus === 'Selesai'
              ? `Kupon ${item['Nomor Kupon']} ditandai Selesai.`
              : `Kupon ${item['Nomor Kupon']} dibatalkan.`,
          };
          this.silentRefreshData();
        } catch (error) {
          item['Status Pengambilan'] = prevStatus;
          this.toast = { type: 'error', message: error?.message || 'Gagal mengubah status kupon.' };
        }
      };

      if (prevStatus === 'Selesai') {
        this.showConfirmModal('Batalkan kupon ini ?', applyChange);
        return;
      }

      await applyChange();
    },
    showConfirmModal(title, onConfirm) {
      this.confirmModal = { show: true, title, message: '', onConfirm };
    },
    get filteredKuponBesar() {
      let data = this.kuponBesar;
      if (this.kuponBesarFilter !== 'semua') {
        data = data.filter((item) => item['Status Pengambilan'] === this.kuponBesarFilter);
      }
      if (this.kuponBesarQuery) {
        const query = this.kuponBesarQuery.toLowerCase();
        data = data.filter((item) => (item['Nomor Kupon'] || '').toLowerCase().includes(query));
      }
      return data;
    },
    async submitLogin() {
      this.saving = true;
      this.savingMessage = 'Memeriksa akses pengguna...';

      try {
        const user = await callApi('login', this.forms.login);
        this.currentUser = user;
        this.stopAutoRefresh(); // Silent refresh tidak diperlukan untuk user yang login
        this.saveSession(user, this.forms.login.remember);
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
    // ── Blocking Toggle Status Sembelihan + Modal ──
    async toggleStatus(item) {
      const prevStatus = item['Status Sembelihan'];
      const nextStatus = prevStatus === 'SELESAI' ? 'PENDING' : 'SELESAI';

      this.saving = true;
      this.savingMessage = nextStatus === 'SELESAI'
        ? `Menandai ${item.Deskripsi} sebagai Selesai...`
        : `Mengubah status ${item.Deskripsi} ke Pending...`;

      try {
        await callApi('updateStatusSembelihan', { id: item.ID, status: nextStatus });

        // Sukses: update item langsung + optimistic update hewanSelesai
        item['Status Sembelihan'] = nextStatus;

        // Optimistic update hewanSelesai agar tombol "Buat Pengiriman" langsung bekerja
        if (nextStatus === 'SELESAI' && item.Lokasi === 'RPH') {
          if (!this.hewanSelesai.find((h) => h.ID === item.ID)) {
            this.hewanSelesai.push(item);
          }
        } else if (nextStatus === 'PENDING') {
          this.hewanSelesai = this.hewanSelesai.filter((h) => h.ID !== item.ID);
        }

        this.silentRefreshData(); // fire-and-forget — sync data di background

        this.saving = false;

        // Tampilkan modal khusus sembelihan
        this.sembelihanModal = {
          show: true,
          itemId: item.ID,
          itemDesc: item.Deskripsi,
          nextStatus,
        };
        this.syncIcons();

      } catch (error) {
        this.saving = false;
        this.toast = {
          type: 'error',
          message: error?.message || 'Gagal mengubah status. Coba lagi.',
        };
      }
    },
    submitPengiriman() {
      if (this.forms.pengiriman._submitting) return;
      if (!this.forms.pengiriman.idHewan) {
        this.toast = { type: 'error', message: 'Pilih hewan terlebih dahulu.' };
        return;
      }

      const formData = {
        idHewan: this.forms.pengiriman.idHewan,
        kepala: this.forms.pengiriman.kepala,
        kaki: this.forms.pengiriman.kaki,
        paha: this.forms.pengiriman.paha,
        hati: this.forms.pengiriman.hati,
        jantung: this.forms.pengiriman.jantung,
        buntut: this.forms.pengiriman.buntut,
        badan: this.forms.pengiriman.badan,
        catatan: this.forms.pengiriman.catatan || '',
      };

      this.forms.pengiriman._submitting = true;
      this.forms.pengiriman = { idHewan: '', kepala: 0, kaki: 0, paha: 0, hati: 0, jantung: 0, buntut: 0, badan: 0, catatan: '', _submitting: true };
      this.toast = { type: 'success', message: 'Mencatat pengiriman...' };

      callApi('createPengiriman', formData)
        .then((result) => {
          this.forms.pengiriman._submitting = false;
          this.toast = {
            type: 'success',
            message: result?.message || `Pengiriman untuk ${formData.idHewan} berhasil dibuat dan sedang dikirim ke Pondok.`,
          };
          this.silentRefreshData();
        })
        .catch((error) => {
          this.forms.pengiriman = { ...formData, _submitting: false };
          this.toast = { type: 'error', message: error?.message || 'Gagal membuat pengiriman. Coba lagi.' };
        });
    },
    // ── Optimistic UI: Terima pengiriman ──
    togglePenerimaanDetail(id) {
      if (!this.penerimaanExpanded) this.penerimaanExpanded = {};
      this.penerimaanExpanded[id] = !this.penerimaanExpanded[id];
    },
    confirmTerimaPengiriman(item) {
      this.penerimaanConfirm = { show: true, item };
    },
    closePenerimaanConfirm() {
      this.penerimaanConfirm = { show: false, item: null };
    },
    terimaPengiriman(idPengiriman) {
      if (!idPengiriman) {
        this.penerimaanConfirm = { show: false, item: null };
        return;
      }
      const index = this.pengirimanBelumDiterima.findIndex(
        (item) => item['ID Pengiriman'] === idPengiriman
      );
      if (index === -1) {
        this.penerimaanConfirm = { show: false, item: null };
        return;
      }

      // Simpan backup untuk rollback
      const backup = this.pengirimanBelumDiterima[index];

      // Optimistic: langsung hapus dari list
      this.pengirimanBelumDiterima.splice(index, 1);

      this.penerimaanConfirm = { show: false, item: null };

      callApi('receivePengiriman', { idPengiriman })
        .then(() => {
          this.toast = { type: 'success', message: `Pengiriman ${idPengiriman} berhasil diterima.` };
        })
        .catch((error) => {
          // Rollback: kembalikan ke posisi semula
          this.pengirimanBelumDiterima.splice(index, 0, backup);
          this.toast = { type: 'error', message: error?.message || 'Gagal menerima pengiriman. Coba lagi.' };
        });
    },
    // ── Optimistic UI: Input daging masuk/keluar ──
    submitDaging(type) {
      if (this.forms[type]._submitting) return;
      const fn = type === 'masuk' ? 'inputDagingMasuk' : 'inputDagingKeluar';
      const formData = { ...this.forms[type] };
      const dashKey = type === 'masuk' ? 'masuk' : 'keluar';

      this.forms[type]._submitting = true;
      const prevDashboard = { ...this.dashboard[dashKey] };

      this.dashboard[dashKey] = {
        kecil:  Number(this.dashboard[dashKey].kecil  || 0) + Number(formData.kecil  || 0),
        besar:  Number(this.dashboard[dashKey].besar  || 0) + Number(formData.besar  || 0),
        kepala: Number(this.dashboard[dashKey].kepala || 0) + Number(formData.kepala || 0),
        kaki:   Number(this.dashboard[dashKey].kaki   || 0) + Number(formData.kaki   || 0),
        buntut: Number(this.dashboard[dashKey].buntut || 0) + Number(formData.buntut || 0),
      };

      this.forms[type] = { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0, _submitting: true };

      callApi(fn, formData)
        .then(() => {
          this.forms[type] = { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0, _submitting: false };
          const totalBungkus = Number(formData.kecil || 0) + Number(formData.besar || 0);
          this.showSuccessModal(
            `Daging ${type === 'masuk' ? 'Masuk' : 'Keluar'} Berhasil`,
            `Data daging ${type} berhasil dicatat. ${totalBungkus > 0 ? `Total ${totalBungkus} bungkus.` : ''}`.trim()
          );
        })
        .catch((error) => {
          this.dashboard[dashKey] = prevDashboard;
          this.forms[type] = { ...formData, _submitting: false };
          this.toast = { type: 'error', message: error?.message || `Gagal menyimpan daging ${type}. Coba lagi.` };
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
    showSuccessModal(title, message) {
      if (this.successModalTimer) {
        clearTimeout(this.successModalTimer);
        this.successModalTimer = null;
      }
      this.successModal = { show: true, title, message };
      this.successModalTimer = setTimeout(() => {
        this.successModal.show = false;
        this.successModalTimer = null;
      }, 2400);
    },
    closeConfirmModal() {
      if (this.confirmModal.onConfirm) {
        this.confirmModal.onConfirm = null;
      }
      this.confirmModal.show = false;
      this.confirmModal.title = '';
      this.confirmModal.message = '';
    },
    confirmModalAction() {
      if (typeof this.confirmModal.onConfirm === 'function') {
        const action = this.confirmModal.onConfirm;
        this.closeConfirmModal();
        action();
      } else {
        this.closeConfirmModal();
      }
    },
    closeSuccessModal() {
      if (this.successModalTimer) {
        clearTimeout(this.successModalTimer);
        this.successModalTimer = null;
      }
      this.successModal.show = false;
    },
    closeSembelihanModal() {
      this.sembelihanModal = { show: false, itemId: '', itemDesc: '', nextStatus: '' };
    },
    goToPengiriman(itemId) {
      // Tutup modal
      this.closeSembelihanModal();
      // Set ID hewan di form pengiriman
      this.forms.pengiriman.idHewan = itemId;
      // Pastikan panel pengiriman di mode form (bukan history)
      this.activePanel.pengiriman = 'form';
      // Navigasi ke tab pengiriman
      this.tab = 'rph-pengiriman';
      this.mobileMenuOpen = false;
      this.syncIcons();
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