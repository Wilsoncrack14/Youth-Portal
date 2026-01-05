# Youth Portal 🚀

Una plataforma gamificada para el crecimiento espiritual de jóvenes, integrando lectura bíblica, estudios interactivos y asistencia de Inteligencia Artificial.

## ✨ Características Principales

*   **Gamificación Espiritual:** Sistema de Niveles (XP), Rachas diarias y Medallas desbloqueables.
*   **Lectura Bíblica 2026:** Plan "Reavivados por su Palabra" automatizado día a día.
*   **Asistente IA (Groq):** Chat inteligente para responder dudas bíblicas y emocionales.
*   **Escuela Sabática:** Lecciones semanales integradas.
*   **Portal Social:** Rankings y comunidad.

## 🛠️ Tecnologías

*   **Frontend:** React + Vite + TypeScript.
*   **Backend:** Supabase (Auth, Database, Edge Functions).
*   **IA:** Groq API (Llama 3) via Supabase Edge Function.
*   **Estilos:** TailwindCSS + Glassmorphism UI.

## 🚀 Instalación y Uso Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/Wilsoncrack14/Youth-Portal.git
    cd Youth-Portal
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno (`.env`):**
    Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=https://hvtrkzhxdmuhuscyagdl.supabase.co
    VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
    ```

4.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    Visita `http://localhost:3001` (o el puerto que te indique la consola).

## 🔄 Guía de Mantenimiento y Despliegue

### Subir cambios a la Web (Frontend)
Vercel se actualiza automáticamente al hacer push:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```

### Actualizar la IA (Backend)
Si modificas las Edge Functions (`supabase/functions`):
```bash
npx supabase functions deploy mistral-chat --no-verify-jwt --project-ref hvtrkzhxdmuhuscyagdl
```

---
*Desarrollado con ❤️ para jóvenes.*
