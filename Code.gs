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

function getAppData() {
  initDatabase();

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
  initDatabase();
  const jenis = String(payload.jenis || '').trim();
  const qty = Number(payload.qty || 0);

  if (!['Sapi', 'Kambing'].includes(jenis)) throw new Error('Jenis hewan tidak valid.');
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Qty harus berupa angka minimal 1.');

  const sheet = getSheet_(SHEETS.HEWAN);
  const existing = readSheetAsObjects_(SHEETS.HEWAN);
  const now = new Date();
  const startNumber = existing.filter((item) => item.Jenis === jenis).length + 1;
  const rows = [];

  for (let i = 0; i < qty; i += 1) {
    const id = nextId_(SHEETS.HEWAN, 'ID', 4, existing.length + rows.length + 1);
    const number = startNumber + i;
    rows.push([id, `${jenis} ${number}`, jenis, 'PENDING', 'RPH', now, now]);
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS[SHEETS.HEWAN].length).setValues(rows);
  return { success: true, message: `${qty} data ${jenis} berhasil dibuat.` };
}

function inputKupon(payload) {
  initDatabase();
  const jenis = String(payload.jenis || '').trim();
  const qty = Number(payload.qty || 0);

  if (!['Besar', 'Kecil'].includes(jenis)) throw new Error('Jenis kupon tidak valid.');
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Qty harus berupa angka minimal 1.');

  const sheet = getSheet_(SHEETS.KUPON);
  const id = `KPN-${nextId_(SHEETS.KUPON, 'ID Kupon', 4)}`;
  sheet.appendRow([id, jenis, qty, new Date()]);

  return { success: true, message: `Kupon ${jenis} sebanyak ${qty} berhasil dicatat.` };
}

function updateStatusSembelihan(id, status) {
  initDatabase();
  if (!['PENDING', 'SELESAI'].includes(status)) throw new Error('Status sembelihan tidak valid.');

  const sheet = getSheet_(SHEETS.HEWAN);
  const row = findRowByValue_(sheet, 'ID', id);
  if (row < 2) throw new Error('Data hewan tidak ditemukan.');

  const statusCol = getColumnIndex_(sheet, 'Status Sembelihan');
  const updatedCol = getColumnIndex_(sheet, 'Tanggal Update');
  sheet.getRange(row, statusCol).setValue(status);
  sheet.getRange(row, updatedCol).setValue(new Date());

  return { success: true, message: `Status hewan ${id} diubah menjadi ${status}.` };
}

function createPengiriman(payload) {
  initDatabase();
  const idHewan = String(payload.idHewan || '').trim();
  const hewanSheet = getSheet_(SHEETS.HEWAN);
  const hewanRow = findRowByValue_(hewanSheet, 'ID', idHewan);
  if (hewanRow < 2) throw new Error('Hewan tidak ditemukan.');

  const hewan = getRowObject_(hewanSheet, hewanRow);
  if (hewan['Status Sembelihan'] !== 'SELESAI') throw new Error('Hanya hewan berstatus SELESAI yang bisa dikirim.');
  if (hewan.Lokasi !== 'RPH') throw new Error('Hewan ini tidak berada di RPH.');

  const qty = normalizePartQty_(payload);
  const pengirimanSheet = getSheet_(SHEETS.PENGIRIMAN);
  const idPengiriman = `KRM-${nextId_(SHEETS.PENGIRIMAN, 'ID Pengiriman', 4)}`;
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

  hewanSheet.getRange(hewanRow, getColumnIndex_(hewanSheet, 'Lokasi')).setValue('Dalam Pengiriman');
  hewanSheet.getRange(hewanRow, getColumnIndex_(hewanSheet, 'Tanggal Update')).setValue(now);

  return { success: true, message: `Pengiriman ${idPengiriman} berhasil dibuat.` };
}

function receivePengiriman(idPengiriman) {
  initDatabase();
  const pengirimanSheet = getSheet_(SHEETS.PENGIRIMAN);
  const pengirimanRow = findRowByValue_(pengirimanSheet, 'ID Pengiriman', idPengiriman);
  if (pengirimanRow < 2) throw new Error('Pengiriman tidak ditemukan.');

  const pengiriman = getRowObject_(pengirimanSheet, pengirimanRow);
  if (pengiriman.Status === 'DITERIMA') throw new Error('Pengiriman ini sudah diterima.');

  const now = new Date();
  pengirimanSheet.getRange(pengirimanRow, getColumnIndex_(pengirimanSheet, 'Status')).setValue('DITERIMA');
  pengirimanSheet.getRange(pengirimanRow, getColumnIndex_(pengirimanSheet, 'Tanggal Terima')).setValue(now);

  const hewanSheet = getSheet_(SHEETS.HEWAN);
  const hewanRow = findRowByValue_(hewanSheet, 'ID', pengiriman['ID Hewan']);
  if (hewanRow >= 2) {
    hewanSheet.getRange(hewanRow, getColumnIndex_(hewanSheet, 'Lokasi')).setValue('Pondok');
    hewanSheet.getRange(hewanRow, getColumnIndex_(hewanSheet, 'Tanggal Update')).setValue(now);
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
  initDatabase();
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
  initDatabase();
  const qty = normalizeDagingQty_(payload);
  const sheet = getSheet_(sheetName);
  const id = `${prefix}-${nextId_(sheetName, 'ID Input', 4)}`;

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

function getColumnIndex_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf(headerName);
  if (index === -1) throw new Error(`Kolom ${headerName} tidak ditemukan di sheet ${sheet.getName()}.`);
  return index + 1;
}

function findRowByValue_(sheet, headerName, value) {
  const column = getColumnIndex_(sheet, headerName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, column, lastRow - 1, 1).getValues().flat();
  const index = values.findIndex((item) => String(item) === String(value));
  return index === -1 ? -1 : index + 2;
}

function getRowObject_(sheet, rowNumber) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce((obj, header, index) => {
    obj[header] = values[index];
    return obj;
  }, {});
}

function nextId_(sheetName, idHeader, width, fallbackNumber) {
  const rows = readSheetAsObjects_(sheetName);
  const maxNumber = rows.reduce((max, row) => {
    const raw = String(row[idHeader] || '');
    const match = raw.match(/(\d+)$/);
    const number = match ? Number(match[1]) : 0;
    return Math.max(max, number);
  }, 0);

  return String(Math.max(maxNumber + 1, fallbackNumber || 1)).padStart(width, '0');
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

function serializeValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
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
