# FlowPlan

Planificador personal (Expo + Node.js + PostgreSQL).

## Quick start

### Backend

```bash
docker compose up -d
cp server/.env.example server/.env
npm install
npm run db:push
npm run db:seed
npm run server
```

API: http://localhost:3000 — ver [`docs/API.md`](docs/API.md).

Demo: `demo@flowplan.app` / `demo1234`

### App (Expo)

```bash
npm start
```

La app detecta sola la URL del API. Si falla la red:

1. Arranca el backend: `npm run server` (debe responder en http://localhost:3000/health).
2. **Emulador Android:** en `.env` pon `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`.
3. **Móvil físico (Expo Go):** usa la IP LAN de tu PC (`ip -4 addr`), misma Wi‑Fi.
4. Reinicia Expo con caché limpia: `npx expo start -c`.

Frontend: [`docs/FRONTEND.md`](docs/FRONTEND.md)

## Get started (Expo)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
