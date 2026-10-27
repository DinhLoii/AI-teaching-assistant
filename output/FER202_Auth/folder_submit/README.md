# FER202 - React Registration and Login

React 19 + Vite 6. Run on Node.js 20.19+:

```sh
npm install
npm run dev -- --host 0.0.0.0 --port 8080
```

Open `http://localhost:8080`. Build: `npm run build`.

Routes: `/#register`, `/#login`, `/#dashboard`.
No account is seeded: register a new account first.

Frontend authentication simulation for coursework only; no backend/API/database.
Accounts use localStorage (salted PBKDF2 password verifier); the current profile
uses sessionStorage, survives reload in the same tab and is removed on logout.
This is not real server-side authentication. Use test data only.

Form controls have labels and stable `data-testid` selectors for browser tests.
