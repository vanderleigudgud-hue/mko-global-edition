# MKO Global Edition — projeto inicial

Frontend React + Vite, preparado para Supabase.

1. Instale Node.js 20+.
2. Copie `.env.example` para `.env.local`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. No terminal desta pasta, execute `npm install` e `npm run dev`.

Use apenas a chave pública `sb_publishable_...` no navegador. Nunca coloque `sb_secret_...` ou `service_role` no frontend. O painel administrativo ainda precisa ser implementado após finalizar e testar as políticas RLS.
