# Solarman Workstation

Teste Tecnico: Integracao com API Solarman - Marco de 2026.

Aplicacao web para autenticar na API Solarman e listar plantas solares com paginacao, UI responsiva/acessivel e tratamento robusto de erros.

## Funcionalidades

- Autenticacao via `POST /account/v1.0/token` com:
  - `appId` na query string
  - body com `appSecret`, `email`, `password` (SHA256), `orgId`
- Persistencia local do token para reutilizacao.
- Listagem via `POST /station/v1.0/list` com:
  - header `Authorization: bearer {accessToken}`
  - body com `page`, `size`, `language` (opcional)
- Exibicao das plantas em cards (modo padrao) com todos os campos exigidos.
- Tabela comparativa opcional com campos complementares.
- Paginacao com `Anterior`, `Proxima` e `Pagina X`.
- Estados de `loading`, `erro` e `vazio`.

## Arquitetura

- `frontend/`: Vue 3 + Vite + TypeScript
- `backend/`: Node.js + Express + Axios
- Backend atua como BFF para:
  - centralizar chamadas Solarman
  - aplicar SHA256 da senha
  - tratar erros de rede/upstream/negocio

## Estrutura

```txt
prova!/
  backend/
    src/
      config.js
      solarmanClient.js
      server.js
  frontend/
    src/
      App.vue
      style.css
```

## Instalacao

Pre-requisitos:

- Node.js 20+ (recomendado)
- npm 10+

Instale dependencias:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Configuracao

1. No backend, copie o arquivo de exemplo:

```bash
cd backend
copy .env.example .env
```

Preencha o arquivo `backend/.env` com suas credenciais Solarman reais. Nenhuma credencial real deve ser versionada.

2. No frontend, copie o arquivo de exemplo:

```bash
cd frontend
copy .env.example .env
```

## Como executar localmente

1. Inicie o backend:

```bash
cd backend
npm run dev
```

Backend disponivel em `http://localhost:3001`.

2. Em outro terminal, inicie o frontend:

```bash
cd frontend
npm run dev
```

Frontend disponivel em `http://localhost:5173`.

3. Fluxo na interface:
- Clique em `Autenticar conta`.
- A lista de plantas e carregada automaticamente.
- Use paginacao para navegar.
- Ative a tabela comparativa quando necessario.

## Campos exibidos por planta

- `name`
- `locationAddress`
- `networkStatus`
- `generationPower` (convertido para kW quando necessario)
- `installedCapacity` (kW)
- taxa de utilizacao (`generationPower / installedCapacity * 100`)
- `type`
- `gridInterconnectionType`
- `startOperatingTime`
- `lastUpdateTime`
- `batterySoc` (quando aplicavel)
- `ownerName` (quando disponivel)
- `contactPhone` (quando disponivel)

## Tratamento de erros implementado

- Erro de autenticacao.
- Erro de negocio Solarman (`success=false`/`code` de falha).
- Erro de rede/timeout (`503`/`504` no backend).
- Resposta invalida da API (sem `accessToken` ou sem `stationList`).
- Estado vazio de dados no frontend.

## Decisoes tecnicas

- Mantidos os metodos `POST` exigidos no contrato (sem traducao para `GET`).
- Token armazenado no `localStorage` para reutilizacao durante a sessao de uso local.
- Datas tratadas como milissegundos com fallback para segundos quando detectado payload nesse formato.
- Status de rede exibido exatamente como retornado pela API (`ONLINE`, `ALL_ONLINE`, `PARTIAL_ONLINE`, `OFFLINE`, etc.).

## Build

Frontend:

```bash
cd frontend
npm run build
```

Backend (checagem de sintaxe):

```bash
cd backend
node -c src/server.js
node -c src/solarmanClient.js
```
