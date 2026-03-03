# Solarman Workstation

Teste Tecnico: Integracao com API Solarman - Marco de 2026.

Aplicacao web para autenticar na API Solarman e listar plantas solares com paginacao, interface responsiva e tratamento robusto de erros.

## Funcionalidades

- Autenticacao via `POST /account/v1.0/token` com:
  - `appId` na query string.
  - body com `appSecret`, `email`, `password` (SHA256) e `orgId`.
- Persistencia local do token para reutilizacao.
- Listagem via `POST /station/v1.0/list` com:
  - header `Authorization: bearer {accessToken}`.
  - body com `page`, `size` e `language` (opcional).
- Exibicao em cards (modo padrao) com todos os campos exigidos no teste.
- Tabela comparativa complementar opcional (sem filtros).
- Paginacao com `Anterior`, `Proxima` e `Pagina X`.
- Estados claros de `loading`, `erro` e `vazio`.

## Arquitetura

- `frontend/`: Vue 3 + Vite + TypeScript.
- `backend/`: Node.js + Express + Axios.
- Backend atua como BFF para:
  - centralizar chamadas Solarman.
  - aplicar SHA256 da senha.
  - tratar falhas de rede, timeout e erros de negocio.

## Estrutura do projeto

```txt
prova!/
  backend/
    api/
      index.js
    src/
      app.js
      config.js
      solarmanClient.js
      server.js
    .env.example
  frontend/
    src/
      App.vue
      style.css
    .env.example
  README.md
```

## Requisitos

- Node.js 20+ (recomendado).
- npm 10+.
- Conta Solarman com credenciais validas no backend.

## Instalacao

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Configuracao

1. Backend:

```bash
cd backend
copy .env.example .env
```

Preencha `backend/.env` com suas credenciais reais:

- `SOLARMAN_APP_ID`
- `SOLARMAN_APP_SECRET`
- `SOLARMAN_EMAIL`
- `SOLARMAN_PASSWORD`
- `SOLARMAN_ORG_ID`
- opcionais: `SOLARMAN_BASE_URL`, `SOLARMAN_TIMEOUT_MS`, `PORT`

2. Frontend:

```bash
cd frontend
copy .env.example .env
```

Ajuste `VITE_API_BASE_URL` se necessario.

## Como executar localmente

1. Inicie o backend:

```bash
cd backend
npm run dev
```

Backend local: `http://localhost:3001`

2. Em outro terminal, inicie o frontend:

```bash
cd frontend
npm run dev
```

Frontend local: `http://localhost:5173`

3. Fluxo de uso:
- Abrir o menu `Autenticacao` no topo.
- Clicar em `Autenticar conta`.
- Navegar pelas paginas da lista.
- Ativar tabela comparativa quando necessario.

## Exposicao externa com Cloudflare Tunnel

Nao e obrigatorio ter dominio proprio para testes rapidos.

### Opcao 1: URL temporaria `trycloudflare.com` (sem dominio proprio)

1. Garanta frontend e backend rodando localmente.
2. Rode o tunnel para o frontend:

```bash
cloudflared tunnel --url http://localhost:5173
```

3. Acesse a URL `https://<nome>.trycloudflare.com` gerada no terminal.

Observacao: o Vite ja esta configurado com `allowedHosts: ['.trycloudflare.com']` em `frontend/vite.config.ts`.

### Opcao 2: Dominio proprio (URL estavel)

1. Ter dominio gerenciado na Cloudflare.
2. Autenticar no `cloudflared`.
3. Criar tunnel nomeado e mapear DNS para o tunnel.
4. Apontar esse host para o frontend local (ou para sua infraestrutura alvo).

## Campos exibidos por planta

- `name`
- `locationAddress`
- `networkStatus`
- `generationPower` (normalizado para kW quando necessario)
- `installedCapacity` (kW)
- taxa de utilizacao (`generationPower / installedCapacity * 100`)
- `type`
- `gridInterconnectionType`
- `startOperatingTime`
- `lastUpdateTime`
- `batterySoc` (quando aplicavel)
- `ownerName` (quando disponivel)
- `contactPhone` (quando disponivel)

## Tratamento de erros

- Falha de autenticacao.
- Erro de negocio Solarman (`success=false` ou `code` de falha).
- Erro de rede e timeout (`503`/`504` no backend).
- Resposta invalida da API (sem `accessToken` ou sem `stationList`).
- Estado vazio no frontend.
- Validacao de campos obrigatorios (`accessToken`, `page`, `size`) no endpoint de listagem.

## Decisoes tecnicas

- Metodos `POST` mantidos exatamente conforme contrato.
- Header `Authorization: bearer {accessToken}` preservado.
- Datas tratadas como milissegundos com fallback automatico para segundos.
- Status de rede exibido como retornado pela API (`ONLINE`, `ALL_ONLINE`, `PARTIAL_ONLINE`, `OFFLINE`, etc.).
- Token salvo no `localStorage` para reutilizacao local.

## Validacoes recomendadas

Frontend:

```bash
cd frontend
npm run build
```

Backend (sintaxe):

```bash
cd backend
node -c src/app.js
node -c src/server.js
node -c src/solarmanClient.js
```
