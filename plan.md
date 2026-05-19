# Bakkah Qurban App — System Concept Documentation

## 📋 Overview

**Qurban App** adalah aplikasi web berbasis SPA (Single Page Application) untuk monitoring dan operasional kegiatan qurban secara real-time. Aplikasi ini menghubungkan tiga peran utama: **Admin**, **RPH** (Rumah Potong Hewan), dan **Pondok** (tim distribusi), dengan dashboard publik yang bisa diakses tanpa login.

---

## 🚀 Teknologi

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | HTML5 + Alpine.js 3.x | Reactive SPA framework |
| **Styling** | Tailwind CSS (CDN) + Custom CSS (styles.css) | Utility-first CSS + komponen kustom |
| **Icons** | Lucide Icons | UI icons (refresh, login, menu, dll) |
| **Font** | Inter (Google Fonts) | Font utama aplikasi (weight 400–950) |
| **Backend** | Google Apps Script (`Code.gs`) | REST-like API via JSONP |
| **Database** | Google Sheets | Penyimpanan data |
| **PWA** | Service Worker + Manifest | Installable, offline-ready |

---

## 👥 User Roles

| Role | Kode | Akses |
|------|------|-------|
| **Public** | `Public` | Hanya lihat dashboard (tanpa login) |
| **Admin** | `Admin` | Registrasi hewan, input kupon, dashboard |
| **RPH** | `RPH` | Sembelihan, pengiriman daging, dashboard |
| **Pondok** | `Pondok` | Penerimaan, input daging masuk/keluar, dashboard |
| **Developer** | `Developer` | Full access semua fitur |

---

## 🗂️ Arsitektur Data (Google Sheets)

### Sheet 1: `hewan`

| Field | Tipe | Contoh |
|-------|------|--------|
| ID | Auto | 0001 |
| Deskripsi | Text | Sapi 1 |
| Jenis | Enum | Sapi / Kambing |
| Status Sembelihan | Enum | PENDING / SELESAI |
| Lokasi | Enum | RPH / Pondok |

### Sheet 2: `kupon`

| Field | Tipe |
|-------|------|
| ID | Auto |
| Jenis | Besar / Kecil |
| Qty | Number |

### Sheet 3: `pengiriman`

| Field | Tipe |
|-------|------|
| ID Pengiriman | Auto |
| ID Hewan | Reference → hewan.ID |
| Status | Enum: DIKIRIM / DITERIMA |
| Kepala, Kaki, Paha, Hati, Jantung, Buntut, Badan | Number |
| Timestamp | Date |

### Sheet 4: `daging_{masuk,keluar}`

| Field | Tipe |
|-------|------|
| ID | Auto |
| Kecil, Besar, Kepala, Kaki, Buntut | Number |
| Timestamp | Date |

---

## 🔌 API Endpoints (Google Apps Script)

Semua request via **JSONP callback** (karena GAS tidak support CORS untuk Web App publik).

| Action | Method | Desc |
|--------|--------|------|
| `getAppData` | GET | Ambil semua data dashboard + hewan + pengiriman |
| `login` | GET | Autentikasi user (username + password) |
| `registerHewan` | GET | Daftarkan hewan baru (jenis + qty) |
| `inputKupon` | GET | Input kupon baru |
| `updateStatusSembelihan` | GET | Toggle status sembelihan (PENDING ↔ SELESAI) |
| `createPengiriman` | GET | Buat pengiriman dari RPH ke Pondok |
| `receivePengiriman` | GET | Konfirmasi penerimaan di Pondok |
| `inputDagingMasuk` | GET | Catat daging masuk ke stok Pondok |
| `inputDagingKeluar` | GET | Catat daging keluar (distribusi) |

---

## 🧩 Modul & Halaman

### 1. Dashboard Publik (tab: `dashboard`)

**Akses:** Semua role termasuk Public (tanpa login)

**Komponen:**
- **Daging Tersedia** — selisih total masuk − total keluar (bungkus)
- **Daging Masuk** — total bungkusan (kecil + besar) yang masuk
- **Daging Keluar** — total bungkusan yang didistribusikan
- **Jumlah Kepala** — stok kepala tersedia
- **Jumlah Kaki** — stok kaki tersedia
- **Jumlah Buntut** — stok buntut tersedia
- **Progress Panel** — per jenis hewan (Sapi / Kambing):
  - Tampilkan semua nomor hewan dalam grid
  - Warna merah = sudah disembelih, putih = belum
  - Total, selesai, pending
- **Ringkasan Keseluruhan** — Total hewan, jumlah & persentase disembelih/belum, dengan progress bar
- **Keterangan** — legend box (merah = sudah, putih = belum)

**Auto Refresh:**
- Hanya untuk user Public: silent refresh setiap 60 detik (tanpa loading overlay)

---

### 2. Login (tab: `login`)

**Akses:** Semua

**Fitur:**
- Form username + password
- Checkbox "Remember me" → pakai localStorage / sessionStorage
- Validasi via API `login`
- Setelah login → redirect ke default tab sesuai role

**Session Storage:**
- `localStorage` (jika Remember) atau `sessionStorage`
- Key: `qurbanUser` → JSON `{ name, role }`

**Auto-refresh:**
- Berhenti saat login
- Aktif lagi saat logout

---

### 3. Registrasi Hewan (tab: `admin-hewan`)

**Akses:** Admin, Developer

**Form:**
| Field | Tipe |
|-------|------|
| Jenis | Select (Sapi / Kambing) |
| Qty | Number (min 1) |

**Proses:** Submit → API `registerHewan` → generate N baris data di sheet dengan status PENDING, lokasi RPH

**Statistik:** Menampilkan total sapi & kambing, selesai & pending

---

### 4. Input Kupon (tab: `admin-kupon`)

**Akses:** Admin, Developer

**Form:**
| Field | Tipe |
|-------|------|
| Jenis | Select (Besar / Kecil) |
| Qty | Number |

---

### 5. Status Penyembelihan (tab: `rph-sembelihan`)

**Akses:** RPH, Developer

**Fitur:**
- **Filter Tab:** Semua | Sapi | Kambing — filter berdasarkan jenis hewan
- **Search Bar:** Cari ID atau deskripsi (case-insensitive, realtime)
- **Card Grid:** Setiap hewan ditampilkan dalam card:
  - Nama/deskripsi
  - Status (PENDING / SELESAI)
  - Tombol "Toggle Status" untuk mengubah status
- **Visual:** PENDING = putih, SELESAI = merah

**Computed (Alpine):** `filteredSembelihan` — filter hewan array berdasarkan `sembelihanFilter` + `sembelihanQuery`

---

### 6. Pengiriman Daging (tab: `rph-pengiriman`)

**Akses:** RPH, Developer

**Fitur:**
- Dropdown hewan dengan status **SELESAI** saja
- Input qty untuk 7 bagian: Kepala, Kaki, Paha, Hati, Jantung, Buntut, Badan
- Submit → API `createPengiriman`

---

### 7. Penerimaan Pengiriman (tab: `pondok-penerimaan`)

**Akses:** Pondok, Developer

**Fitur:**
- Tabel daftar pengiriman yang belum diterima
- Tombol **Terima** → API `receivePengiriman` → update lokasi hewan jadi `Pondok`

---

### 8. Input Daging Masuk (tab: `pondok-masuk`)

**Akses:** Pondok, Developer

**Form:**
| Field | Tipe |
|-------|------|
| Bungkusan Kecil | Number |
| Bungkusan Besar | Number |
| Kepala | Number |
| Kaki | Number |
| Buntut | Number |

---

### 9. Input Daging Keluar (tab: `pondok-keluar`)

**Akses:** Pondok, Developer

**Form:** Sama seperti Daging Masuk.

**Dashboard Impact:** Daging Keluar mengurangi stok tersedia di dashboard.

---

### 10. Akun (tab: `account`)

**Akses:** Semua yang login (Admin, RPH, Pondok, Developer)

**Fitur:**
- Tampilkan nama & role user
- Tombol **Logout** → hapus session → redirect ke dashboard publik

---

## 🎨 UI/UX Components

### Header (app-header)

| Bagian | Konten |
|--------|--------|
| Kiri | Logo PWA (icon-512.png, 50×50px, lingkaran) + Judul + Deskripsi |
| Kanan | Jam & tanggal (desktop only) + Tombol Refresh + Tombol Login |

### Bottom Navigation (mobile)

Muncul hanya untuk user yang login (bukan Developer). Menampilkan tab relevan sesuai role.

### Side Navigation (desktop)

Sidebar kiri 248px untuk user login. Menu sama dengan drawer mobile.

### Drawer (mobile)

Toggle lewat ikon menu di header. Backdrop + slide-in dari kiri.

### Busy Overlay

Fullscreen overlay dengan spinner saat loading/saving. Muncul hanya untuk **first load**, tidak untuk silent refresh atau background refresh (cache sudah ada).

### Toast Notification

Notifikasi sukses/error di bagian atas konten. Transisi smooth.

### Skeleton Loading

Skeleton cards saat first load dashboard (6 card). Tidak muncul lagi setelah data pertama masuk (cache).

---

## ⚡ Performance Features

### 1. API Cache (localStorage)

Key: `qurbanApiCache` — TTL: 30 detik

| Skenario | Behavior |
|----------|----------|
| First visit (no cache) | Loading overlay + fetch API |
| Refresh < 30 detik | Data dari cache (instant), background refresh tetap jalan |
| Refresh > 30 detik | Cache dikembalikan dulu, data baru diupdate setelah fetch |
| Setelah save (hewan/kupon/dll) | Cache di-refresh dengan data baru |

### 2. Refresh Throttle

Flag `_refreshPending` mencegah multiple refresh bertumpuk. Jika ada refresh berjalan, panggilan baru di-skip.

### 3. Silent Refresh (Public)

Interval 60 detik tanpa loading overlay. Error diabaikan (silent).

### 4. CDN Loading

- Tailwind CSS (CDN) — generate utility classes
- Alpine.js — reactive framework
- Lucide Icons — SVG icons
- Google Fonts (Inter) — preconnect + stylesheet

---

## 📱 PWA (Progressive Web App)

### Manifest (`manifest.json`)

| Properti | Value |
|----------|-------|
| Name | Bakkah Qurban App |
| Short Name | Qurban App |
| Display | `standalone` (fullscreen seperti native app) |
| Theme Color | `#0b2f66` (biru tua header) |
| Background | `#f8fafc` |
| Orientation | portrait-primary |
| Icons | 192×192 + 512×512 (maskable) |

### Service Worker (`sw.js`)

| Event | Strategy |
|-------|----------|
| `install` | Cache semua static assets (HTML, JS, CSS, icons, images) |
| `activate` | Hapus cache lama, claim clients |
| `fetch` (local) | **Cache-first** — ambil dari cache, fallback ke network |
| `fetch` (CDN) | **Network-first** — coba network, fallback ke cache |
| `fetch` (GAS API) | **Network-only** — tidak di-cache |

### Meta Tags

- `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- `apple-touch-icon`, `icon` sizes 192×512

### CSS PWA

`@media (display-mode: standalone)` — safe area insets, overscroll containment, touch optimization

---

## 🖼️ Asset Files

```
assets/
├── ic-ekor.png        # Icon ekor/buntut (54×54)
├── ic-kaki.png        # Icon kaki (54×54)
├── ic-kambing.png     # Icon kambing (54×54)
├── ic-kepala.png      # Icon kepala (54×54)
├── ic-sapi.png        # Icon sapi (54×54)
├── image.png          # Preview image
└── icons/
    ├── icon-192.png   # PWA icon 192×192
    └── icon-512.png   # PWA icon 512×512
```

---

## 🔐 Session & Security

### Login Flow
1. User submit username + password
2. API `login` memvalidasi ke Google Sheets
3. Jika valid → simpan `{ name, role }` ke localStorage/sessionStorage
4. Auto-redirect ke default tab

### Auto-logout
- Tidak ada session expiry built-in
- Logout manual lewat tombol di tab Akun
- Cache (`qurbanApiCache`) tetap ada setelah logout

### API Security
- Google Apps Script Web App deployed sebagai "Anyone"
- Autentikasi dilakukan di sisi GAS (validasi username/password dari sheet)
- JSONP callback — tidak bisa pakai POST/headers

---

## 📁 File Structure

```
Qurban App V4/
├── index.html          # Main SPA (Alpine.js template)
├── app.js              # Alpine.js component + API logic
├── styles.css          # All custom CSS
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── Code.gs             # Google Apps Script backend
├── docs.md             # Technical notes
├── plan.md             # This document
└── assets/             # Images & icons
    ├── ic-*.png
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

---

## ⚙️ State Management (Alpine.js)

Semua state dikelola dalam satu object `qurbanApp()`:

| State | Type | Default | Fungsi |
|-------|------|---------|--------|
| `loading` | Boolean | false | Loading overlay |
| `saving` | Boolean | false | Saving overlay |
| `hasLoaded` | Boolean | false | First load selesai |
| `tab` | String | 'dashboard' | Tab aktif |
| `currentUser` | Object | null | Session user |
| `hewan` | Array | [] | Data hewan |
| `sembelihanFilter` | String | 'semua' | Filter jenis hewan |
| `sembelihanQuery` | String | '' | Pencarian teks |
| `toast` | Object | {} | Notifikasi |
| `forms.*` | Object | {} | Form data |

### Computed Properties

| Property | Deskripsi |
|----------|-----------|
| `filteredSembelihan` | Filter hewan berdasarkan jenis + query |
| `visibleTabs()` | Tab yang bisa diakses role saat ini |
| `menuTabs()` | Sama dengan visibleTabs |
| `bottomTabs()` | Tab untuk bottom nav (mobile) |
| `animalGroups()` | Grup hewan per jenis untuk progress panel |
| `availablePackages()` | Stok bungkus tersedia (masuk − keluar) |
| `dashboardPercent()` | Persentase untuk ringkasan |

---

## 🧪 Data Flow

### Flow Registrasi Hewan
```
Admin → Form (jenis, qty) → API `registerHewan` → Google Sheets
    → Generate N baris → Refresh dashboard → Cache update
```

### Flow Sembelihan
```
RPH → Tab Sembelihan → Filter/Search → Klik Toggle Status
    → API `updateStatusSembelihan` → Sheet update → Refresh
```

### Flow Pengiriman
```
RPH → Pilih hewan selesai → Input qty bagian
    → API `createPengiriman` → Sheet → Status berubah
```

### Flow Penerimaan
```
Pondok → Lihat daftar → Klik "Terima"
    → API `receivePengiriman` → Lokasi jadi "Pondok"
```

### Flow Daging Masuk/Keluar
```
Pondok → Input qty → API `inputDagingMasuk` / `inputDagingKeluar`
    → Sheet → Dashboard otomatis update
```

---

## 🔄 Auto Refresh Behavior

| Kondisi | Method | Loading Overlay? | Cache? |
|---------|--------|------------------|--------|
| First load (halaman baru) | `refresh()` | ✅ Ya (first load) | ✅ Disimpan |
| Klik tombol Refresh | `refresh()` | ❌ Tidak (cache dulu) | ✅ Diupdate |
| Setelah Save | `runSave()` → `refresh()` | ❌ Tidak | ✅ Diupdate |
| Public auto-refresh (60 detik) | `silentRefresh()` | ❌ Tidak | ✅ Tidak pakai |
| Login | `submitLogin()` | ❌ Tidak | ❌ Hapus + refresh |
| Logout | `logout()` | ❌ Tidak | ✅ Start auto-refresh |

---

## 📐 Responsive Breakpoints

| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 520px | Mobile | Header compact, bottom nav, drawer menu |
| 640px+ | Tablet | Metric grid 2 kolom, summary 3 kolom |
| 1024px+ | Desktop | Sidebar 248px, metric grid 6 kolom |

---