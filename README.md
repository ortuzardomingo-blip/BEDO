# BEDO

Nuestro rincón: un álbum de fotos, una lista de planes por cumplir y ruletas para decidir panoramas al azar en Santiago.
Funciona en el celular y en el PC, y se puede instalar en la pantalla de inicio como una app.

## Qué tiene

- **Álbum**: suben fotos desde el celular o el PC (JPG, PNG, HEIC del iPhone, WEBP, GIF, AVIF…). Se comprimen solas, se ordenan por la fecha en que se tomaron y se ven a pantalla completa con zoom y descarga. En el PC también se pueden arrastrar.
- **Marco**: fotos alrededor de la app (una tira arriba y columnas a los lados en pantallas grandes). Se eligen en ⚙️ Ajustes → *Fotos del marco*, o desde cada foto.
- **Planes**: lista de cosas por hacer. Al marcar un plan como cumplido se guardan la fecha, una nota y sus fotos, y el plan pasa a *Cumplidos* con su portada.
- **Ruleta**: ruletas editables (Comida, Panorama, Dulce y café, En casa, Escapada, Presupuesto) y el **Plan sorpresa**, que sortea panorama, comida y postre a la vez. Lo que sale se puede agregar a Planes.

## Tecnología

React + Vite + TypeScript · Tailwind CSS · Motion (animaciones) · Lucide (íconos) · Yet Another React Lightbox (visor de fotos) · browser-image-compression + heic2any + exifr (procesamiento de fotos) · Supabase (base de datos, fotos y login) · GitHub Pages (hosting).

## Ejecutarla en tu computador

```bash
npm install
npm run dev
```

Sin configurar nada, la app arranca en **modo local**: todo se guarda en ese navegador y no se comparte con otros dispositivos.

## Conectar la nube (para compartir entre celular y PC)

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. Abre **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.
3. Ve a **Authentication → Users → Add user** y crea los usuarios (uno para cada uno, o uno compartido) con correo y contraseña. Marca *Auto confirm user*.
4. En **Authentication → Sign In / Providers** desactiva *Allow new users to sign up* para que nadie más pueda crear cuenta.
5. Copia dos datos del proyecto:
   - **Project URL** (`https://xxxx.supabase.co`): en **Project Settings → Data API**, o con el botón verde **Connect** de arriba.
   - **Publishable key** (`sb_publishable_...`): en **Project Settings → API Keys**.
   - Para desarrollo local: crea `.env.local` a partir de `.env.example` con esos dos valores.
   - Para la versión publicada: en GitHub → **Settings → Secrets and variables → Actions → pestaña Variables**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

> La *publishable key* puede ser pública: los datos y las fotos están protegidos por las reglas de seguridad del script SQL, que exigen haber iniciado sesión. La **secret key** nunca debe ir en la app ni compartirse.

## Publicar en GitHub Pages

1. Sube el código a GitHub (rama `main`).
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada `git push` a `main` vuelve a publicar la app en `https://<usuario>.github.io/BEDO/`.

## Instalarla en el celular

Abre la página en el celular → **Compartir → Agregar a inicio** (iPhone) o **⋮ → Instalar app** (Android).
