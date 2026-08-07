# Bluff Quiz Game

MVP командної гри з фейковими відповідями:

- ролі: `ADMIN`, `HOST`, `PLAYER`, `SPECTATOR`;
- 2, 3 або 5 команд;
- змінна кількість питань;
- адміністратор створює шаблон гри, питання, правильні відповіді, кількість гравців і час фаз;
- адміністратор додає до кожного питання одну штрафну неправильну відповідь;
- ведучий працює з готовою грою, обирає капітанів і керує перебігом;
- один капітан команди на всю Частину 1;
- окремий капітан команди на всю Частину 2;
- гравці не-капітани бачать перебіг гри без права вводу;
- spectator бачить окремий публічний екран;
- QR-коди та посилання для ведучого, гравців і глядачів;
- серверний таймер з паузою та додаванням часу;
- бали: `+100` своїй команді за правильну відповідь, `+50` іншій команді за голос на її фейкову відповідь, `-50` своїй команді за штрафну відповідь адміністратора.

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Test Flow

1. Адміністратор відкриває `http://localhost:3000`, створює гру і отримує код.
2. Гравці відкривають `/play/КОД`, вводять ім'я і обирають команду.
3. Ведучий відкриває `/host/КОД`, обирає капітанів Частини 1 і натискає `Почати гру`.
4. Капітани Частини 1 вводять фейкові відповіді на всі питання.
5. Після Частини 1 ведучий обирає капітанів Частини 2 і запускає голосування.
6. Капітани Частини 2 голосують між правильною відповіддю, фейками команд і штрафною відповіддю адміністратора.
7. Після голосування або завершення таймера ведучий натискає `Результати гри`.
8. Глядачі можуть відкрити `/spectator/КОД`.

## Checks

```bash
npm run lint
npm run build
```

## Prisma / PostgreSQL

The app stores live game state in PostgreSQL through Prisma. The active multiplayer state is persisted in `GameState.data` as JSON, while the schema also includes normalized tables for the production data model.

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then set:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

## Server Deploy

Required environment variables:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="https://your-domain.example"
```

Generic server flow:

```bash
npm install
npm run prisma:deploy
npm run build
npm run start
```

Railway flow:

1. Push the repository to GitHub.
2. Create a Railway project from the GitHub repository.
3. Add Railway PostgreSQL.
4. Add `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.
5. In the app service, set the Railway pre-deploy command to `npx prisma migrate deploy`.
6. Deploy the Next.js service.

Local development still falls back to in-memory state when `DATABASE_URL` is not set, so the app can be tested without a database. On the server, set `DATABASE_URL` so all users share the same PostgreSQL-backed game state.
