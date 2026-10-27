# Recetario

Aplicación web instalable (PWA) para guardar recetas y calcular masas con porcentaje panadero. Funciona sin conexión, se adapta al teléfono y a la PC, y puede sincronizar las recetas entre dispositivos mediante una planilla de Google propia.

## Funciones

- Lista de recetas con búsqueda y filtro (Todas, Panificados, Generales).
- Calculadora por peso total o por unidades (cantidad × gramos por unidad).
- Cualquier cantidad en gramos se puede editar y el resto se recalcula.
- Sub-recetas con desglose y harina total.
- Ingredientes fijos fuera del porcentaje (por ejemplo, 1 huevo) y notas.
- Recetas generales con cantidades, pasos y escalado por porciones.
- Editor con reordenamiento arrastrando desde la manija.
- Versión de escritorio: lista a la izquierda y receta a dos columnas (desde 960 px de ancho).
- Sincronización con una planilla de Google, con vinculación de dispositivos por código QR.
- Exportar e importar un archivo `.json`.
- Modo claro y oscuro.

## Estructura

```
index.html              Página principal
manifest.webmanifest    Datos para instalar la app
sw.js                   Service worker (uso sin conexión)
css/estilos.css         Estilos y colores (claro, oscuro, escritorio)
js/app.js               Pantallas y eventos
js/calculo.js           Cálculos (porcentaje panadero, sub-recetas, porciones)
js/datos.js             Guardado, importación, exportación y fusión de cambios
js/sync.js              Comunicación con el servicio de sincronización
js/lib/qrcode.js        Generador de códigos QR (Kazuhiko Arase, licencia MIT)
google/Code.gs          Script de Google Apps Script para la sincronización
fuentes/                Tipografías Figtree y Bricolage Grotesque (licencia OFL)
iconos/                 Íconos de la app
```

No usa frameworks ni pasos de compilación: se publica tal cual.

## Sincronización

Las recetas se guardan en cada dispositivo y, si la sincronización está activa, también en una planilla de Google del usuario:

- El script `google/Code.gs` vive dentro de esa planilla (Extensiones → Apps Script) y solo tiene permiso sobre ella.
- Se implementa como aplicación web (Ejecutar como: Yo · Acceso: Cualquier usuario) y se protege con una clave, que se escribe en la constante `CLAVE`. La clave **no** se guarda en este repositorio.
- La app sincroniza al abrirse, después de cada cambio, al recuperar la conexión y cada 5 minutos.
- Si una receta cambió en dos dispositivos, queda la versión más reciente. Las eliminaciones también se sincronizan.
- La hoja «Recetas» muestra cada receta en una fila. El historial de versiones de la planilla sirve como respaldo.

Para conectar un dispositivo nuevo: en un dispositivo ya conectado, **Ajustes → Sincronización → Vincular otro dispositivo** y escanear el código QR con el otro.

## Publicación (GitHub Pages)

**Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.

## Instalar

- **Android (Chrome):** abrir la dirección de la app → menú ⋮ → **Agregar a la pantalla principal** o **Instalar app**.
- **PC (Edge o Chrome):** ícono de instalar en la barra de direcciones, o menú → **Aplicaciones → Instalar este sitio como aplicación**.

## Actualizar la app

Al subir cambios, la app instalada descarga la versión nueva en segundo plano y la muestra la próxima vez que se abre. Si se agregan archivos, sumarlos a la lista `ARCHIVOS` de `sw.js` y cambiar el nombre de `CACHE`.

## Probar en la PC

Los módulos de JavaScript necesitan un servidor local:

```
python -m http.server 8000
```

y luego abrir `http://localhost:8000`.
