const SHEETS = {
  HEWAN: 'Hewan',
  KUPON: 'Kupon',
  PENGIRIMAN: 'Pengiriman',
  DAGING_MASUK: 'Daging Masuk',
  DAGING_KELUAR: 'Daging Keluar',
  USERS: 'Users',
  SETTINGS: 'Settings',
};

const HEADERS = {
  [SHEETS.HEWAN]: ['ID', 'Deskripsi', 'Jenis', 'Status Sembelihan', 'Lokasi', 'Tanggal Dibuat', 'Tanggal Update'],
  [SHEETS.KUPON]: ['ID Kupon', 'Jenis Kupon', 'Qty', 'Tanggal Dibuat'],
  [SHEETS.PENGIRIMAN]: [
    'ID Pengiriman',
    'ID Hewan',
    'Deskripsi Hewan',
    'Qty Kepala',
    'Qty Kaki',
    'Qty Paha',
    'Qty Hati',
    'Qty Jantung',
    'Qty Buntut',
    'Qty Badan',
    'Status',
    'Tanggal Kirim',
    'Tanggal Terima',
  ],
  [SHEETS.DAGING_MASUK]: ['ID Input', 'Qty Bungkusan Kecil', 'Qty Bungkusan Besar', 'Qty Kepala', 'Qty Kaki', 'Qty Buntut', 'Tanggal Input'],
  [SHEETS.DAGING_KELUAR]: ['ID Input', 'Qty Bungkusan Kecil', 'Qty Bungkusan Besar', 'Qty Kepala', 'Qty Kaki', 'Qty Buntut', 'Tanggal Input'],
  [SHEETS.USERS]: ['Username', 'Password', 'Nama', 'Role', 'Status'],
  [SHEETS.SETTINGS]: ['Key', 'Value'],
};

const DEFAULT_USERS = [
  ['admin', 'admin123', 'Admin Qurban', 'Admin', 'ACTIVE'],
  ['rph', 'rph123', 'Tim RPH', 'RPH', 'ACTIVE'],
  ['pondok', 'pondok123', 'Tim Pondok', 'Pondok', 'ACTIVE'],
  ['developer', 'dev123', 'Developer', 'Developer', 'ACTIVE'],
];

// ── Module-level cache ──
let _scriptTimezone = null;

function getTimezone_() {
  if (!_scriptTimezone) _scriptTimezone = Session.getScriptTimeZone();
  return _scriptTimezone;
}

// ── Helper: baca headers sheet sekali ──
function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    headers,
    indexOf: (name) => {
      const idx = headers.indexOf(name);
      if (idx === -1) throw new Error(`Kolom ${name} tidak ditemukan di sheet ${sheet.getName()}.`);
      return idx + 1;
    },
  };
}

// ── Public API ──

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (params.action) {
    return handleApiRequest_(params);
  }

  return apiResponse_({
    success: true,
    data: {
      app: 'Bakkah Qurban App API',
      message: 'Tambahkan parameter action untuk memakai API.',
      example: '?action=getAppData&callback=callbackName',
    },
  }, params.callback || '');
}

function doPost(e) {
  const params = parsePostParams_(e);
  return handleApiRequest_(params);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Qurban App')
    .addItem('Inisiasi Database', 'initDatabase')
    .addToUi();
}

// ── Database initialization (hanya dipanggil dari menu/action khusus) ──

function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const headers = HEADERS[sheetName];
    const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const isEmpty = existing.every((cell) => cell === '');

    if (isEmpty || existing.join('|') !== headers.join('|')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  });

  seedDefaultUsers_();

  return { success: true, message: 'Database berhasil diinisiasi di active spreadsheet.' };
}

// ── Action functions (tanpa initDatabase) ──

function getAppData() {
  // OPTIMIZED: Tidak panggil initDatabase(), baca sheet langsung
  const hewan = readSheetAsObjects_(SHEETS.HEWAN);
  const kupon = readSheetAsObjects_(SHEETS.KUPON);
  const pengiriman = readSheetAsObjects_(SHEETS.PENGIRIMAN);
  const dagingMasuk = readSheetAsObjects_(SHEETS.DAGING_MASUK);
  const dagingKeluar = readSheetAsObjects_(SHEETS.DAGING_KELUAR);

  return {
    hewan,
    kupon,
    pengiriman,
    dagingMasuk,
    dagingKeluar,
    hewanSelesai: hewan.filter((item) => item['Status Sembelihan'] === 'SELESAI' && item.Lokasi === 'RPH'),
    pengirimanBelumDiterima: pengiriman.filter((item) => item.Status === 'DIKIRIM'),
    dashboard: {
      totalHewan: hewan.length,
      totalSelesai: hewan.filter((item) => item['Status Sembelihan'] === 'SELESAI').length,
      totalPending: hewan.filter((item) => item['Status Sembelihan'] === 'PENDING').length,
      totalPengiriman: pengiriman.length,
      masuk: sumDaging_(dagingMasuk),
      keluar: sumDaging_(dagingKeluar),
    },
  };
}

function registerHewan(payload) {
  const jenis = String(payload.jenis || '').trim();
  const qty = Number(payload.qty || 0);

  if (!['Sapi', 'Kambing'].includes(jenis)) throw new Error('Jenis hewan tidak valid.');
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Qty harus berupa angka minimal 1.');

  const sheet = getSheet_(SHEETS.HEWAN);
  // OPTIMIZED: Baca existing untuk hitung startNumber, tapi pakai array bukan readSheetAsObjects_ untuk ID
  const existingData = readSheetAsObjects_(SHEETS.HEWAN);
  const now = new Date();
  const startNumber = existingData.filter((item) => item.Jenis === jenis).length + 1;
  const rows = [];
  const width = 4;

  for (let i = 0; i < qty; i += 1) {
    const id = nextId_(sheet, width);
    const number = startNumber + i;
    rows.push([id, `${jenis} ${number}`, jenis, 'PENDING', 'RPH', now, now]);
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS[SHEETS.HEWAN].length).setValues(rows);
  return { success: true, message: `${qty} data ${jenis} berhasil dibuat.` };
}

function inputKupon(payload) {
  const jenis = String(payload.jenis || '').trim();
  const qty = Number(payload.qty || 0);

  if (!['Besar', 'Kecil'].includes(jenis)) throw new Error('Jenis kupon tidak valid.');
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Qty harus berupa angka minimal 1.');

  const sheet = getSheet_(SHEETS.KUPON);
  const id = `KPN-${nextId_(sheet, 4)}`;
  sheet.appendRow([id, jenis, qty, new Date()]);

  return { success: true, message: `Kupon ${jenis} sebanyak ${qty} berhasil dicatat.` };
}

function updateStatusSembelihan(id, status) {
  if (!['PENDING', 'SELESAI'].includes(status)) throw new Error('Status sembelihan tidak valid.');

  const sheet = getSheet_(SHEETS.HEWAN);
  const row = findRowByValue_(sheet, 'ID', id);
  if (row < 2) throw new Error('Data hewan tidak ditemukan.');

  // OPTIMIZED: Baca header sekali untuk semua kolom
  const h = getHeaderMap_(sheet);
  const statusCol = h.indexOf('Status Sembelihan');
  const updatedCol = h.indexOf('Tanggal Update');
  const now = new Date();

  // OPTIMIZED: Update dua kolom berbeda (masih dua setValue karena kolom tidak bersebelahan)
  sheet.getRange(row, statusCol).setValue(status);
  sheet.getRange(row, updatedCol).setValue(now);

  return { success: true, message: `Status hewan ${id} diubah menjadi ${status}.` };
}

function createPengiriman(payload) {
  const idHewan = String(payload.idHewan || '').trim();
  const hewanSheet = getSheet_(SHEETS.HEWAN);
  const hewanRow = findRowByValue_(hewanSheet, 'ID', idHewan);
  if (hewanRow < 2) throw new Error('Hewan tidak ditemukan.');

  // OPTIMIZED: Baca headers hewanSheet sekali
  const hewanH = getHeaderMap_(hewanSheet);
  const hewanHeaders = hewanH.headers;
  const hewanValues = hewanSheet.getRange(hewanRow, 1, 1, hewanSheet.getLastColumn()).getValues()[0];
  const hewan = hewanHeaders.reduce((obj, header, index) => {
    obj[header] = hewanValues[index];
    return obj;
  }, {});

  if (hewan['Status Sembelihan'] !== 'SELESAI') throw new Error('Hanya hewan berstatus SELESAI yang bisa dikirim.');
  if (hewan.Lokasi !== 'RPH') throw new Error('Hewan ini tidak berada di RPH.');

  const qty = normalizePartQty_(payload);
  const pengirimanSheet = getSheet_(SHEETS.PENGIRIMAN);
  const idPengiriman = `KRM-${nextId_(pengirimanSheet, 4)}`;
  const now = new Date();

  pengirimanSheet.appendRow([
    idPengiriman,
    idHewan,
    hewan.Deskripsi,
    qty.kepala,
    qty.kaki,
    qty.paha,
    qty.hati,
    qty.jantung,
    qty.buntut,
    qty.badan,
    'DIKIRIM',
    now,
    '',
  ]);

  // OPTIMIZED: Pakai header map yang sudah dibaca
  const lokasiCol = hewanH.indexOf('Lokasi');
  const updatedCol = hewanH.indexOf('Tanggal Update');
  hewanSheet.getRange(hewanRow, lokasiCol).setValue('Dalam Pengiriman');
  hewanSheet.getRange(hewanRow, updatedCol).setValue(now);

  return { success: true, message: `Pengiriman ${idPengiriman} berhasil dibuat.` };
}

function receivePengiriman(idPengiriman) {
  const pengirimanSheet = getSheet_(SHEETS.PENGIRIMAN);
  const pengirimanRow = findRowByValue_(pengirimanSheet, 'ID Pengiriman', idPengiriman);
  if (pengirimanRow < 2) throw new Error('Pengiriman tidak ditemukan.');

  // OPTIMIZED: Baca headers pengirimanSheet + data baris sekali
  const pngH = getHeaderMap_(pengirimanSheet);
  const pngHeaders = pngH.headers;
  const pngValues = pengirimanSheet.getRange(pengirimanRow, 1, 1, pengirimanSheet.getLastColumn()).getValues()[0];
  const pengiriman = pngHeaders.reduce((obj, header, index) => {
    obj[header] = pngValues[index];
    return obj;
  }, {});

  if (pengiriman.Status === 'DITERIMA') throw new Error('Pengiriman ini sudah diterima.');

  const now = new Date();
  const statusCol = pngH.indexOf('Status');
  const terimaCol = pngH.indexOf('Tanggal Terima');
  pengirimanSheet.getRange(pengirimanRow, statusCol).setValue('DITERIMA');
  pengirimanSheet.getRange(pengirimanRow, terimaCol).setValue(now);

  const hewanSheet = getSheet_(SHEETS.HEWAN);
  const hewanRow = findRowByValue_(hewanSheet, 'ID', pengiriman['ID Hewan']);
  if (hewanRow >= 2) {
    // OPTIMIZED: Baca headers hewanSheet sekali
    const hewanH = getHeaderMap_(hewanSheet);
    hewanSheet.getRange(hewanRow, hewanH.indexOf('Lokasi')).setValue('Pondok');
    hewanSheet.getRange(hewanRow, hewanH.indexOf('Tanggal Update')).setValue(now);
  }

  return { success: true, message: `Pengiriman ${idPengiriman} diterima di Pondok.` };
}

function inputDagingMasuk(payload) {
  return saveDaging_(SHEETS.DAGING_MASUK, 'MSK', payload);
}

function inputDagingKeluar(payload) {
  return saveDaging_(SHEETS.DAGING_KELUAR, 'KLR', payload);
}

function login(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();

  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  const user = readSheetAsObjects_(SHEETS.USERS).find((item) => {
    return String(item.Username).trim() === username &&
      String(item.Password).trim() === password &&
      String(item.Status).trim().toUpperCase() === 'ACTIVE';
  });

  if (!user) throw new Error('Username atau password tidak sesuai.');

  return {
    username: user.Username,
    name: user.Nama,
    role: user.Role,
  };
}

// ── API handler ──

function handleApiRequest_(params) {
  const callback = params.callback || '';

  try {
    const action = String(params.action || '').trim();
    const payload = parsePayload_(params.payload);
    let data;

    switch (action) {
      case 'initDatabase':
        data = initDatabase();
        break;
      case 'getAppData':
        data = getAppData();
        break;
      case 'registerHewan':
        data = registerHewan(payload);
        break;
      case 'inputKupon':
        data = inputKupon(payload);
        break;
      case 'updateStatusSembelihan':
        data = updateStatusSembelihan(payload.id, payload.status);
        break;
      case 'createPengiriman':
        data = createPengiriman(payload);
        break;
      case 'receivePengiriman':
        data = receivePengiriman(payload.idPengiriman);
        break;
      case 'inputDagingMasuk':
        data = inputDagingMasuk(payload);
        break;
      case 'inputDagingKeluar':
        data = inputDagingKeluar(payload);
        break;
      case 'login':
        data = login(payload);
        break;
      default:
        throw new Error(`Action ${action} tidak dikenal.`);
    }

    return apiResponse_({ success: true, data }, callback);
  } catch (error) {
    return apiResponse_({ success: false, error: error.message || String(error) }, callback);
  }
}

// ── Utility functions ──

function parsePostParams_(e) {
  const params = e && e.parameter ? Object.assign({}, e.parameter) : {};
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : '';

  if (!contents) return params;

  try {
    return Object.assign(params, JSON.parse(contents));
  } catch (error) {
    return params;
  }
}

function parsePayload_(payload) {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;

  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error('Payload harus berupa JSON valid.');
  }
}

function apiResponse_(body, callback) {
  const json = JSON.stringify(body);

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function saveDaging_(sheetName, prefix, payload) {
  const qty = normalizeDagingQty_(payload);
  const sheet = getSheet_(sheetName);
  const id = `${prefix}-${nextId_(sheet, 4)}`;

  sheet.appendRow([id, qty.kecil, qty.besar, qty.kepala, qty.kaki, qty.buntut, new Date()]);
  return { success: true, message: `Data ${sheetName.toLowerCase()} ${id} berhasil disimpan.` };
}

function seedDefaultUsers_() {
  const sheet = getSheet_(SHEETS.USERS);
  if (sheet.getLastRow() > 1) return;

  sheet.getRange(2, 1, DEFAULT_USERS.length, HEADERS[SHEETS.USERS].length).setValues(DEFAULT_USERS);
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} belum tersedia. Jalankan initDatabase().`);
  return sheet;
}

function readSheetAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).filter((row) => row.some((cell) => cell !== '')).map((row) => {
    return headers.reduce((obj, header, index) => {
      obj[header] = serializeValue_(row[index]);
      return obj;
    }, {});
  });
}

// OPTIMIZED: Hanya baca baris terakhir dari kolom 1, bukan seluruh sheet
function nextId_(sheet, width) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return String(1).padStart(width, '0');

  const lastId = String(sheet.getRange(lastRow, 1).getValue());
  const match = lastId.match(/(\d+)$/);
  const number = match ? Number(match[1]) : 0;
  return String(number + 1).padStart(width, '0');
}

function findRowByValue_(sheet, headerName, value) {
  const column = getColumnIndex_(sheet, headerName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, column, lastRow - 1, 1).getValues().flat();
  const index = values.findIndex((item) => String(item) === String(value));
  return index === -1 ? -1 : index + 2;
}

function getColumnIndex_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);
  if (index === -1) throw new Error(`Kolom ${headerName} tidak ditemukan di sheet ${sheet.getName()}.`);
  return index + 1;
}

function normalizePartQty_(payload) {
  return {
    kepala: positiveNumber_(payload.kepala),
    kaki: positiveNumber_(payload.kaki),
    paha: positiveNumber_(payload.paha),
    hati: positiveNumber_(payload.hati),
    jantung: positiveNumber_(payload.jantung),
    buntut: positiveNumber_(payload.buntut),
    badan: positiveNumber_(payload.badan),
  };
}

function normalizeDagingQty_(payload) {
  return {
    kecil: positiveNumber_(payload.kecil),
    besar: positiveNumber_(payload.besar),
    kepala: positiveNumber_(payload.kepala),
    kaki: positiveNumber_(payload.kaki),
    buntut: positiveNumber_(payload.buntut),
  };
}

function positiveNumber_(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number) || number < 0) throw new Error('Qty tidak boleh bernilai negatif.');
  return number;
}

// OPTIMIZED: Cache Session.getScriptTimeZone() untuk menghindari panggilan berulang
function serializeValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, getTimezone_(), 'yyyy-MM-dd HH:mm:ss');
  }

  return value;
}

function sumDaging_(rows) {
  return rows.reduce((total, row) => {
    total.kecil += Number(row['Qty Bungkusan Kecil'] || 0);
    total.besar += Number(row['Qty Bungkusan Besar'] || 0);
    total.kepala += Number(row['Qty Kepala'] || 0);
    total.kaki += Number(row['Qty Kaki'] || 0);
    total.buntut += Number(row['Qty Buntut'] || 0);
    return total;
  }, { kecil: 0, besar: 0, kepala: 0, kaki: 0, buntut: 0 });
}