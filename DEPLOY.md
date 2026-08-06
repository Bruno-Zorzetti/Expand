# Deploy da Plataforma Expand (Vercel + GitHub)

O projeto já está pronto pra publicar: build de produção passa, repositório git iniciado (branch `main`, primeiro commit feito) e `.env.local` protegido pelo `.gitignore` (os tokens do uazapi **não** vão pro GitHub).

Siga os passos abaixo. Onde precisar da sua conta (GitHub/Vercel), sou eu que te guio, mas o login é você que faz.

## 1. Criar o repositório no GitHub

1. Em https://github.com/new crie um repositório **privado** (ex.: `expand-plataforma`). Não marque "add README".
2. No terminal, dentro de `C:\Users\brzar\Hashes\plataforma`, conecte e envie:

```bash
git remote add origin https://github.com/SEU_USUARIO/expand-plataforma.git
git push -u origin main
```

(Se pedir login, use seu usuário do GitHub + um token de acesso pessoal como senha.)

## 2. Importar no Vercel

1. Entre em https://vercel.com com sua conta (pode logar com o GitHub).
2. **Add New → Project** → selecione o repositório `expand-plataforma`.
3. O Vercel detecta **Next.js** sozinho. Não mude Build/Output.
4. **Antes de clicar em Deploy**, abra **Environment Variables** e cole as 7 variáveis abaixo.

## 3. Variáveis de ambiente (no Vercel, não no código)

Copie os **valores** do seu `.env.local` local (eu não os exponho aqui). Marque todas para os ambientes Production, Preview e Development.

| Variável | O que é |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase (pública) |
| `NEXT_PUBLIC_SITE_URL` | A URL de produção — no 1º deploy use a que o Vercel gerar (ex.: `https://expand-plataforma.vercel.app`) |
| `UAZAPI_URL` | Endpoint do uazapi (secreta) |
| `UAZAPI_TOKEN` | Token do uazapi (secreta) |
| `UAZAPI_ADMIN_TOKEN` | Token admin do uazapi (secreta) |
| `HASHES_WHATSAPP` | Número/instância do WhatsApp (secreta) |

Clique em **Deploy**. Em ~1–2 min você recebe a URL `…vercel.app` — está no ar.

## 4. Ajustar o Supabase para a URL de produção (importante p/ login)

No painel do Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://SEU-PROJETO.vercel.app`
- **Redirect URLs**: adicione `https://SEU-PROJETO.vercel.app/**`

Sem isso, o login/confirmação de e-mail pode redirecionar errado.

Depois disso, atualize `NEXT_PUBLIC_SITE_URL` no Vercel com a URL final e faça um **Redeploy**.

## 5. Domínio próprio (quando quiser)

Escolhemos começar com o subdomínio grátis do Vercel. Quando tiver o domínio (ex.: `app.grupoexpand.com.br`):
- Vercel → Project → **Settings → Domains** → adicione o domínio e siga o apontamento de DNS.
- Atualize `NEXT_PUBLIC_SITE_URL` e o Site URL do Supabase para o domínio novo.

## Notas
- Cada `git push` na `main` dispara um deploy automático no Vercel.
- O aviso de build sobre `middleware`→`proxy` é só depreciação do Next 16; não bloqueia nada (dá pra renomear depois).
- Banco (Supabase) é o mesmo em dev e prod por enquanto — quando quiser separar ambientes, criamos um projeto Supabase de produção.
