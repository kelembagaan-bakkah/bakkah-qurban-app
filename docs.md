App Name : Qurban App

Deployment url
https://script.google.com/a/macros/bakkah.sch.id/s/AKfycbzIek6qAuyDTapYx4IzmVxDqYJdeF0wxUB1pQuOuqlsETUYnv2ZOe0GrTn0Bt1mKCkZ4A/exec'

Catatan arsitektur:
- URL deployment di atas dipakai sebagai API penghubung frontend static ke Google Sheet.
- Frontend yang di-host di luar Apps Script memakai file `Index.html`, `styles.css`, dan `app.js`.
- `app.js` sudah menyimpan URL deployment dan memanggil `Code.gs` dengan JSONP, bukan `google.script.run`.
- Di Google Apps Script cukup pasang `Code.gs`, lalu deploy sebagai Web App.

Contoh API:
https://script.google.com/macros/s/AKfycbzIek6qAuyDTapYx4IzmVxDqYJdeF0wxUB1pQuOuqlsETUYnv2ZOe0GrTn0Bt1mKCkZ4A/exec?action=getAppData&callback=namaCallback

Actions API:
- initDatabase
- getAppData
- login
- registerHewan
- inputKupon
- updateStatusSembelihan
- createPengiriman
- receivePengiriman
- inputDagingMasuk
- inputDagingKeluar

Default user setelah `initDatabase()`:
- admin / admin123
- rph / rph123
- pondok / pondok123
- developer / dev123

Role akan mengatur menu:
- Public: Dashboard
- Admin: Beranda, Hewan, Kupon, Akun
- RPH: Beranda, Sembelihan, Pengiriman, Akun
- Pondok: Penerimaan, D. Masuk, D. Keluar, Akun
- Developer: semua menu via sidebar/hamburger, tanpa bottom navbar

script url
https://script.google.com/u/0/home/projects/17GpKITXigH-4sNq7FI30D8kLUtNGT-rzPP7yzwI7jzaxjdoIRbaPwEfC/edit

sheet
https://docs.google.com/spreadsheets/d/1D17mck-MWtDPkdUByeww38fadMDgBZm9i8glhFX-Tfw/edit?gid=361797688#gid=361797688

User Role
- Admin
- RPH
- Pondok
- Developer (All Access)

Tech stack
- html css
- tailwind
- alpine.js
- Google sheet (Database)
- Google app script (Code.gs)
- Lucide icons via CDN untuk ikon UI

Flow Input
1. Admin akan meregistrasikan data hewan dengan form input berikut
- Pilih Jenis Hewan (Sapi, Kambing)
- Jumlah (Qty)

Ketika diinput akan menghasilkan data secara otomatis di sheet datanya berikut
- ID : 0001, 0002, 0003
- Deskripsi: Sapi 1, Sapi 2, Sapi 3 (berurutan Sesuai qty)
- Jenis: Sapi (Sapi atau kambing tergantung input)
- Status Sembelihan (by default "PENDING" untuk input pertama)
- Lokasi (by default adalah "RPH")

akan terbentuk sebuah table di system dengan data diatas

2. Admin punya modul input jumlah kupon dengan form data berikut
- Jenis Kupon (Besar, Kecil)
- Qty

3. RPH akan mengupdate Status Sembelihan dengan sebuah tombol dari PENDING jadi SELESAI (Indikator warna putih berubah menjadi merah saat selesai)

3. RPH ada form input PENGIRIMAN  dengan form berikut
- Pilih Hewan (Hanya yang status penyembelihan selesai)
- ID Pengiriman (auto)
- Qty Kepala (Pcs)
- Qty Kaki (Pcs)
- Qty Paha (Pcs)
- Qty Hati (Pcs)
- Qty Jantung (Pcs)
- Qty Hati (Pcs)
- Qty Buntut (Pcs)
- Qty Badan (Pcs)

4. PONDOK akan menerima data berupa data PENGIRIMAN  dari RPH tadi dan bisa mengonfirmasi diterima (data "Lokasi" berubah jadi "Pondok")

5. PONDOK punya modul system Input Daging Masuk dengan form berikut
- ID Input (Auto)
- Qty Bungkusan Kecil (Pcs)
- Qty Bungkusan Besar (Pcs)
- Qty Kepala (Pcs)
- Qty Kaki (Pcs)
- Qty Buntut (Pcs)

Yang mana akan dihitung sebagai "jumlah Daging Masuk" di Dashboard

6.  PONDOK punya modul system Input Daging Keluar dengan form berikut
- ID Input (Auto)
- Qty Bungkusan Kecil (Pcs)
- Qty Bungkusan Besar (Pcs)
- Qty Kepala (Pcs)
- Qty Kaki (Pcs)
- Qty Buntut (Pcs)

Yang mana akan dihitung sebagai "jumlah Daging Keluar" di Dashboard

7. Dashboard info akan menampilkan (halaman tidak perlu login)
- Qty masuk untuk Bungkusan Kecil, Bungkusan Besar, Kepala, Kaki, Buntut
- Qty keluar untuk Bungkusan Kecil, Bungkusan Besar, Kepala, Kaki, Buntut
- Status hewan sembelihan (Putih jika PENDING dan Merah jika SELESAI)(UI nya dibuat kotak-kotak saja misal Sapi 1, Sapi 2 lalu dibawahnya ada Kambing 1, Kambing 2 atau dengan kata lain di group berdasarkan jenis hewan)
- Total Sembelihan Selesai dan Total Sembelihan Pending (dan berikan persentasi)
- Jumlah kupon besar dan kecil (login only)

