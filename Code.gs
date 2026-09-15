/**
 * SISTEMA DE CONTROL DE GUÍAS DE TRASLADO — Walter Lund
 * Backend en Apps Script. Expone un Web App (doGet/doPost) que la app
 * operativa (index.html) consume vía fetch.
 *
 * SETUP:
 * 1. Crea una Google Sheet nueva. Copia su ID (está en la URL) y pégalo en SHEET_ID abajo.
 * 2. En esa Sheet crea dos pestañas exactamente con estos nombres y encabezados:
 *
 *    Pestaña "Guias" (fila 1, encabezados):
 *    ID | Folio | Fecha | BodegaOrigen | BodegaDestino | TotalKilos | UsuarioDespacho |
 *    FechaSubida | ArchivoURL | Estado | UsuarioRecepcion | FechaRecepcion | Observacion
 *
 *    Pestaña "Usuarios" (fila 1, encabezados):
 *    Nombre | Bodega
 *    (y abajo carga a cada persona con su bodega, ver USUARIOS_INICIALES más abajo
 *    para copiar/pegar rápido)
 *
 * 3. Crea una carpeta en Google Drive para los archivos subidos. Copia su ID y pégalo en DRIVE_FOLDER_ID.
 * 4. Extensiones → Apps Script en la Sheet. Pega este código como Code.gs.
 * 5. Implementar → Nueva implementación → Tipo: Aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario (o "Cualquier usuario de Walter Lund" si es Workspace)
 * 6. Copia la URL del Web App (termina en /exec) y pégala en CONFIG.API_URL dentro de index.html.
 */

const SHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
const DRIVE_FOLDER_ID = 'PEGA_AQUI_EL_ID_DE_TU_CARPETA_DRIVE';

const SHEET_GUIAS = 'Guias';
const SHEET_USUARIOS = 'Usuarios';

// Copiar y pegar directo en la pestaña "Usuarios" (columna A=Nombre, B=Bodega)
// Douglas Hancen        918
// José Castillo         918
// Exequiel Fernandez    918
// Eduardo Peréz         Aldunate
// Cesar Zamora          Aldunate
// Christián Agurto      Aldunate
// Christián Agurto      San Ignacio
// Sebastián Flores      Viel
// Arnoldo Godoy         Viel
// Sebastián Flores      San Ignacio

const BODEGAS = ['918', 'Aldunate', 'Viel', 'San Ignacio'];

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'init') return jsonOut(getInitData());
    if (action === 'pendientes') return jsonOut(getPendientes(e.parameter.bodega));
    return jsonOut({ error: 'Acción no reconocida' });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'crearGuia') return jsonOut(crearGuia(body));
    if (action === 'cerrarGuia') return jsonOut(cerrarGuia(body));

    return jsonOut({ error: 'Acción no reconocida' });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ---- INIT: usuarios + bodegas para poblar los selects del frontend ----
function getInitData() {
  const sheet = getSS().getSheetByName(SHEET_USUARIOS);
  const data = sheet.getDataRange().getValues();
  const usuarios = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    usuarios.push({ nombre: data[i][0], bodega: String(data[i][1]) });
  }
  return { usuarios: usuarios, bodegas: BODEGAS };
}

// ---- Listar guías pendientes de recepción para una bodega destino ----
function getPendientes(bodega) {
  const sheet = getSS().getSheetByName(SHEET_GUIAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);

  const pendientes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idx['Estado']] === 'Pendiente' && String(row[idx['BodegaDestino']]) === String(bodega)) {
      pendientes.push({
        id: row[idx['ID']],
        folio: row[idx['Folio']],
        fecha: row[idx['Fecha']],
        bodegaOrigen: row[idx['BodegaOrigen']],
        bodegaDestino: row[idx['BodegaDestino']],
        totalKilos: row[idx['TotalKilos']],
        usuarioDespacho: row[idx['UsuarioDespacho']],
        fechaSubida: row[idx['FechaSubida']],
        archivoURL: row[idx['ArchivoURL']]
      });
    }
  }
  // Más recientes primero
  pendientes.sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida));
  return { pendientes: pendientes };
}

// ---- Crear guía (subida desde bodega origen) ----
function crearGuia(body) {
  const sheet = getSS().getSheetByName(SHEET_GUIAS);

  let archivoURL = '';
  if (body.archivoBase64 && body.archivoNombre) {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const bytes = Utilities.base64Decode(body.archivoBase64);
    const blob = Utilities.newBlob(bytes, body.archivoMimeType || 'application/octet-stream', body.archivoNombre);
    const file = folder.createFile(blob);
    archivoURL = file.getUrl();
  }

  const id = Utilities.getUuid();
  const fechaSubida = new Date();

  sheet.appendRow([
    id,
    body.folio,
    body.fecha,
    body.bodegaOrigen,
    body.bodegaDestino,
    body.totalKilos,
    body.usuarioDespacho,
    fechaSubida,
    archivoURL,
    'Pendiente',
    '', // UsuarioRecepcion
    '', // FechaRecepcion
    ''  // Observacion
  ]);

  return { ok: true, id: id };
}

// ---- Cerrar guía (recepción en bodega destino) ----
function cerrarGuia(body) {
  const sheet = getSS().getSheetByName(SHEET_GUIAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idx['ID']] === body.id) {
      const rowNum = i + 1;
      const estado = body.conforme ? 'Recepcionado OK' : 'Recepcionado con diferencia';
      sheet.getRange(rowNum, idx['Estado'] + 1).setValue(estado);
      sheet.getRange(rowNum, idx['UsuarioRecepcion'] + 1).setValue(body.usuarioRecepcion);
      sheet.getRange(rowNum, idx['FechaRecepcion'] + 1).setValue(new Date());
      sheet.getRange(rowNum, idx['Observacion'] + 1).setValue(body.observacion || '');
      return { ok: true };
    }
  }
  return { error: 'Guía no encontrada' };
}
