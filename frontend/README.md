# Solarman Workstation - Frontend

Aplicacao Vue 3 responsavel pela interface do teste tecnico Solarman.

## Requisitos

- Node.js 20+
- npm 10+

## Configuracao

1. Crie arquivo de ambiente:

```bash
copy .env.example .env
```

2. Variavel utilizada:

- `VITE_API_BASE_URL` (padrao: `http://localhost:3001`)

## Executar em desenvolvimento

```bash
npm install
npm run dev
```

Aplicacao local: `http://localhost:5173`.

## Build

```bash
npm run build
```

## Observacoes

- A listagem de plantas usa `POST` via backend (`/api/stations/list`).
- O token de autenticacao e armazenado em `localStorage` para reutilizacao.
