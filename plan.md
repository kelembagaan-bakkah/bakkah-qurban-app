# Qurban App — System Concept Documentation

## Overview

**Qurban App** adalah sistem web berbasis SPA sederhana untuk membantu monitoring dan operasional kegiatan qurban secara real-time antara tim RPH dan Pondok.

Sistem dirancang:
- Mobile First
- Ringan
- Real-time menggunakan Google Sheets
- Mudah dikembangkan
- Cocok untuk WebView APK

---

# Application Information

## App Name
**Bakkah Qurban App**

---

# User Roles

| Role | Access |
|---|---|
| Admin | Mengelola data hewan dan kupon |
| RPH | Mengelola proses penyembelihan dan pengiriman |
| Pondok | Mengelola penerimaan dan distribusi daging |
| Developer | Full access seluruh system |

---

# Technology Stack

## Frontend
- HTML
- Tailwind CSS
- Alpine.js

## Backend
- Google Apps Script (`Code.gs`)

## Database
- Google Sheets

---

# Main Modules

---

# 1. Modul Registrasi Hewan (Admin)

## Purpose
Digunakan untuk mendaftarkan hewan qurban ke sistem.

---

## Form Input

| Field | Type |
|---|---|
| Jenis Hewan | Select (`Sapi`, `Kambing`) |
| Qty | Number |

---

## Auto Generated Data

Saat form disubmit, sistem otomatis membuat data sejumlah qty.

### Example Input
- Jenis Hewan: `Sapi`
- Qty: `3`

### Generated Data

| ID | Deskripsi | Jenis | Status Sembelihan | Lokasi |
|---|---|---|---|---|
| 0001 | Sapi 1 | Sapi | PENDING | RPH |
| 0002 | Sapi 2 | Sapi | PENDING | RPH |
| 0003 | Sapi 3 | Sapi | PENDING | RPH |

---

## Default Rules

| Field | Default Value |
|---|---|
| Status Sembelihan | `PENDING` |
| Lokasi | `RPH` |

---

# 2. Modul Input Kupon (Admin)

## Purpose
Digunakan untuk menginput jumlah kupon distribusi qurban.

---

## Form Input

| Field | Type |
|---|---|
| Jenis Kupon | Select (`Besar`, `Kecil`) |
| Qty | Number |

---

# 3. Modul Status Penyembelihan (RPH)

## Purpose
Digunakan untuk mengubah status hewan yang telah selesai disembelih.

---

## Features

- Tombol toggle status:
  - `PENDING`
  - `SELESAI`

---

## UI Indicator

| Status | Color |
|---|---|
| PENDING | Putih |
| SELESAI | Merah |

---

# 4. Modul Pengiriman Daging (RPH)

## Purpose
Digunakan untuk mencatat pengiriman hasil sembelihan dari RPH ke Pondok.

---

## Validation Rules

Hanya hewan dengan status:
- `SELESAI`

yang dapat dipilih untuk pengiriman.

---

## Form Input

| Field | Type |
|---|---|
| Pilih Hewan | Dropdown |
| ID Pengiriman | Auto Generate |
| Qty Kepala | Number |
| Qty Kaki | Number |
| Qty Paha | Number |
| Qty Hati | Number |
| Qty Jantung | Number |
| Qty Buntut | Number |
| Qty Badan | Number |

---

# 5. Modul Penerimaan Pengiriman (Pondok)

## Purpose
Digunakan untuk mengonfirmasi pengiriman dari RPH.

---

## Features

- Melihat data pengiriman dari RPH
- Tombol:
  - `Terima Pengiriman`

---

## Auto Update

Saat pengiriman diterima:

| Field | Updated Value |
|---|---|
| Lokasi | `Pondok` |

---

# 6. Modul Input Daging Masuk (Pondok)

## Purpose
Digunakan untuk mencatat stok daging yang masuk ke area distribusi Pondok.

---

## Form Input

| Field | Type |
|---|---|
| ID Input | Auto Generate |
| Qty Bungkusan Kecil | Number |
| Qty Bungkusan Besar | Number |
| Qty Kepala | Number |
| Qty Kaki | Number |
| Qty Buntut | Number |

---

## Dashboard Impact

Data ini akan dihitung sebagai:
- Total Daging Masuk

---

# 7. Modul Input Daging Keluar (Pondok)

## Purpose
Digunakan untuk mencatat distribusi daging keluar.

---

## Form Input

| Field | Type |
|---|---|
| ID Input | Auto Generate |
| Qty Bungkusan Kecil | Number |
| Qty Bungkusan Besar | Number |
| Qty Kepala | Number |
| Qty Kaki | Number |
| Qty Buntut | Number |

---

## Dashboard Impact

Data ini akan dihitung sebagai:
- Total Daging Keluar

---

# 8. Dashboard Public

## Purpose
Halaman monitoring publik tanpa login.

---

# Dashboard Components

## A. Statistik Daging Masuk

Menampilkan:
- Qty Bungkusan Kecil
- Qty Bungkusan Besar
- Qty Kepala
- Qty Kaki
- Qty Buntut

---

## B. Statistik Daging Keluar

Menampilkan:
- Qty Bungkusan Kecil
- Qty Bungkusan Besar
- Qty Kepala
- Qty Kaki
- Qty Buntut

---

## C. Status Hewan Sembelihan

## UI Concept

Menggunakan card/grid kotak-kotak.

### Example

```txt
[Sapi 1]
[PENDING]

[Sapi 2]
[SELESAI]

[Kambing 1]
[PENDING]