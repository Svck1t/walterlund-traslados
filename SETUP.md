# Setup — App operativa de Guías de Traslado

## 1. Google Sheet
Crea una Sheet nueva con dos pestañas:

**Guias** (encabezados en fila 1):
```
ID | Folio | Fecha | BodegaOrigen | BodegaDestino | TotalKilos | UsuarioDespacho | FechaSubida | ArchivoURL | Estado | UsuarioRecepcion | FechaRecepcion | Observacion
```

**Usuarios** (encabezados en fila 1, luego carga a la gente):
```
Nombre | Bodega
Douglas Hancen | 918
José Castillo | 918
Exequiel Fernandez | 918
Eduardo Peréz | Aldunate
Cesar Zamora | Aldunate
Christián Agurto | Aldunate
Christián Agurto | San Ignacio
Sebastián Flores | Viel
Arnoldo Godoy | Viel
Sebastián Flores | San Ignacio
```

## 2. Carpeta de Drive
Crea una carpeta donde se guardarán las fotos/PDF de las guías subidas. Copia su ID (de la URL).

## 3. Apps Script
1. En la Sheet: Extensiones → Apps Script.
2. Pega el contenido de `Code.gs`.
3. Reemplaza `SHEET_ID` con el ID de tu Sheet y `DRIVE_FOLDER_ID` con el ID de la carpeta.
4. Implementar → Nueva implementación → tipo **Aplicación web**.
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier usuario**
5. Copia la URL que termina en `/exec`.

## 4. Frontend
1. En `index.html`, reemplaza `CONFIG.API_URL` con la URL del paso anterior.
2. Sube el repo a GitHub y despliega en Vercel (mismo flujo que Control Facturas).
3. Reparte el link a las 4 bodegas — no hay password, cada persona entra eligiendo su bodega y su nombre.

## Notas
- "Christián Agurto" quedó cargado en Aldunate y San Ignacio (dijiste ambas) — bórralo de la que no corresponda si fue un error.
- El folio y los kilos se digitan a mano; los productos quedan visibles solo en la foto/PDF adjunto (no se transcriben).
- El estado de una guía pasa de `Pendiente` → `Recepcionado OK` o `Recepcionado con diferencia` cuando la bodega destino la cierra.
