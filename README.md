# MANEX Montážny Denník

Produkčná webová aplikácia pre evidenciu montážnych prác (Next.js App Router, Tailwind CSS, Lucide React, Prisma, PostgreSQL).

## Hlavné funkcie

- Prihlásenie/odhlásenie so zabezpečenou session cookie.
- Jemnozrnný permission systém cez checkboxy pre každého používateľa.
- Správa používateľov a tvorba rolí.
- Zákazky vo formáte `Číslo zákazky - Názov zákazky`.
- Vyhľadávanie zákaziek podľa čísla aj názvu.
- Detail zákazky s časovými záznamami prác.
- Inline úprava zákazky pri oprávnení `EDIT_PROJECT`.
- Export do CSV (UTF-8 s BOM) a tlač denníka.

## Tech stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Lucide React
- Prisma ORM
- PostgreSQL (Neon/Supabase kompatibilné)

## Premenné prostredia

Skopírujte [ .env.example ](.env.example) do `.env` a nastavte hodnoty:

- `DATABASE_URL`: produkčné pripojenie (pooler URL)
- `DIRECT_URL`: priame pripojenie pre migrácie
- `AUTH_SECRET`: dlhý náhodný tajný reťazec

## Lokálne spustenie

1. Nainštalujte závislosti:

```bash
npm install
```

2. Vygenerujte Prisma klienta:

```bash
npm run prisma:generate
```

3. Aplikujte migrácie:

```bash
npm run prisma:migrate
```

4. Naplňte databázu základnými údajmi:

```bash
npm run prisma:seed
```

5. Spustite vývojový server:

```bash
npm run dev
```

## Produkčné nasadenie na Vercel

1. Pridajte premenné `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` do Vercel projektu.
2. Build command nechajte `next build` (pred buildom sa spustí `postinstall`, ktorý volá `prisma generate`).
3. Po deploy aplikujte migrácie:

```bash
npm run prisma:deploy
```

4. Voliteľne spustite seed na bootstrap admin účtu:

```bash
npm run prisma:seed
```

## Predvolené seed konto

- Email: `admin@manex.sk`
- Heslo: `admin123`

Po prvom prihlásení heslo okamžite zmeňte.
