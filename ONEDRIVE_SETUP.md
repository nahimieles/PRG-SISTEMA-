# Guía de Configuración: Vinculación de OneDrive

Para que el sistema se conecte con OneDrive, necesitas registrar tu aplicación en Microsoft Azure (es gratuito y solo toma 5 minutos).

## Paso 1: Registrar la Aplicación
1. Ve al [Portal de Azure](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) e inicia sesión con tu cuenta de Microsoft.
2. Haz clic en **"Nuevo registro"** (New registration).
3. **Nombre**: Ponle algo como "Intranet de Trabajadores".
4. **Tipos de cuenta compatibles**: Selecciona *"Cuentas en cualquier directorio de organización y cuentas personales de Microsoft"* (esto permite que los chicos usen sus cuentas personales o de trabajo).
5. **URI de redirección**:
   - Selecciona **SPA** (Single-page application).
   - Escribe: `http://localhost:3000`
   - **IMPORTANTE**: Haz clic en "Agregar URI" y añade también tu enlace de Vercel (solo el dominio raíz):
     `https://nextjs-boilerplate-delta-bay-eez7fy3o9d.vercel.app`
   *(Así funcionará tanto en tu PC como en la web publicada).*
6. Haz clic en **Registrar**.

## Paso 2: Copiar el ID
Una vez creada, verás una pantalla de "Información general".
- Copia el **"Id. de aplicación (cliente)"**. Es un código largo como `a1b2c3d4-e5f6...`

## Paso 3: Pegar en el Código
1. Abre el archivo en tu proyecto: `lib/authConfig.js`
2. Busca donde dice `"YOUR_CLIENT_ID_HERE"`.
3. Reemplázalo con el código que copiaste.

```javascript
export const msalConfig = {
    auth: {
      clientId: "PEGAR_TU_ID_AQUI", // <--- Aquí
      // ...
    }
};
```

## Paso 4: ¡Listo!
Ahora, entra al Dashboard de Trabajadores o Administración. En la pestaña **"Mis Archivos"** o **"Archivos Cloud"**, aparecerá el botón **"Conectar OneDrive"**.
- Cada trabajador iniciará sesión con **su propia cuenta**.
- El sistema recordará su sesión.

## Solución de Problemas Comunes

### Error AADSTS50011 (Redirect URI Mismatch)
Si al conectar ves un mensaje de error que dice **"The redirect URI '...' specified in the request does not match..."**, significa que la URL que configuraste en Azure no es EXACTAMENTE igual a la que usa tu app.

**Solución rápida en Azure:**
1. Ve a tu aplicación en el Portal de Azure.
2. En el menú izquierdo, haz clic en **Autenticación**.
3. En la sección **URI de redirección (SPA)**, asegúrate de tener EXACTAMENTE esta URL:
   `https://nextjs-boilerplate-delta-bay-eez7fy3o9d.vercel.app`
4. **Borra** cualquier otra que tengas que termine en `/trabajadores/archivos` u otra sub-ruta. Solo debe quedar la raíz.
5. Haz clic en **Guardar** arriba.
6. Espera un minuto y prueba de nuevo.
