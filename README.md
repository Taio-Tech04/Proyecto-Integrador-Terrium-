# Terrium — Real Estate Intelligence Platform 🏙️

> Plataforma de inteligencia inmobiliaria para Argentina. Conectamos inversores, compradores y vendedores con datos precisos del mercado de CABA.

---

## 📐 Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (Nginx)                       │
│          HTML / CSS / JS  ·  Leaflet  ·  Chart.js            │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼─────────────────────────────────────┐
│                   API GATEWAY :4000                           │
│              REST Proxy  +  Apollo GraphQL                    │
└──┬─────────┬──────────┬──────────┬──────────┬───────────────┘
   │         │          │          │          │
:3005      :3001      :3002      :3003      :3004
Users    Listings  Valuations Analytics Notifications
   │         │          │          │          │
   └────────────────────┴──────────┴──────────┘
                         │
              ┌──────────▼──────────┐
              │   RabbitMQ :5672    │  ← Event Bus
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL :5432  │  (5 DBs)
              │   Redis :6379       │  (Cache)
              └─────────────────────┘
```

## 🚀 Inicio rápido

### Requisitos
- Docker Desktop 24+
- Docker Compose v2+
- Node.js 20+ (solo para desarrollo local)
- Git

### Levantar todo con Docker

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/terrium.git
cd terrium

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 3. Levantar todos los servicios
docker compose up --build

# 4. Con herramientas de admin (pgAdmin)
docker compose --profile tools up --build
```

La aplicación estará disponible en:
- 🌐 **Frontend**: http://localhost
- 🔌 **API Gateway**: http://localhost:4000
- 📊 **GraphQL Playground**: http://localhost:4000/graphql
- 🐇 **RabbitMQ Admin**: http://localhost:15672 (terrium / terrium_secret)
- 🗄️ **pgAdmin**: http://localhost:5050 (solo con `--profile tools`)

---

## 📦 Microservicios

| Servicio      | Puerto | Base de datos          | Descripción                            |
|---------------|--------|------------------------|----------------------------------------|
| API Gateway   | 4000   | —                      | Punto de entrada REST + GraphQL        |
| Users         | 3005   | terrium_users          | Auth, perfiles, suscripciones          |
| Listings      | 3001   | terrium_listings       | Propiedades e inmuebles                |
| Valuations    | 3002   | terrium_valuations     | Valuación automática con comparables   |
| Analytics     | 3003   | terrium_analytics      | Métricas, tendencias, mapa de calor    |
| Notifications | 3004   | terrium_notifications  | Emails y alertas                       |

---

## 💳 Planes de Suscripción

| Tier        | Precio ARS/mes | Herramientas                                           |
|-------------|----------------|--------------------------------------------------------|
| FREE        | Gratis         | Búsqueda básica, datos generales del mercado           |
| INVERSOR    | $4.999         | + Historial de precios, valuaciones, alertas           |
| PRO         | $14.999        | + Mapa de calor, analytics avanzados, API access       |
| ENTERPRISE  | A convenir     | + Acceso completo, soporte prioritario, white-label    |

---

## 🛠️ Desarrollo local (sin Docker)

```bash
# Instalar dependencias de todos los servicios
cd api-gateway && npm install && cd ..
cd services/users && npm install && cd ../..
cd services/listings && npm install && cd ../..
cd services/valuations && npm install && cd ../..
cd services/analytics && npm install && cd ../..
cd services/notifications && npm install && cd ../..

# Necesitás PostgreSQL y RabbitMQ corriendo localmente
# Podés levantarlos solo con Docker:
docker compose up postgres redis rabbitmq

# Luego cada servicio en una terminal separada
cd services/users && npm run dev
cd services/listings && npm run dev
# etc.
```

---

## 🧪 Tests

```bash
# En cualquier servicio
cd services/listings
npm test
```

---

## 🚢 CI/CD

El proyecto incluye dos workflows de GitHub Actions:

- **ci.yml**: Se ejecuta en cada push y PR → instala dependencias y corre tests
- **cd.yml**: Se ejecuta al hacer push a `main` → construye imágenes Docker, las publica en GHCR y despliega en producción vía SSH

---

## 📂 Estructura del proyecto

```
terrium/
├── .github/workflows/       # CI/CD
├── api-gateway/             # API Gateway (REST + GraphQL)
├── services/
│   ├── listings/            # Microservicio de propiedades
│   ├── valuations/          # Microservicio de valuaciones
│   ├── analytics/           # Microservicio de analytics
│   ├── notifications/       # Microservicio de notificaciones
│   └── users/               # Microservicio de usuarios
├── frontend/                # Frontend estático (Nginx)
├── scripts/                 # Scripts de init de base de datos
├── docker-compose.yml
└── .env.example
```

---

## 🗺️ Roadmap

- [ ] Integración con MercadoPago para pagos de suscripción
- [ ] Autenticación OAuth2 (Google, LinkedIn)
- [ ] App mobile (React Native)
- [ ] Integración con portales inmobiliarios (ZonaProp, Argenprop)
- [ ] ML para predicción de precios

---

## 📄 Licencia

MIT — © 2025 Terrium. Todos los derechos reservados.

