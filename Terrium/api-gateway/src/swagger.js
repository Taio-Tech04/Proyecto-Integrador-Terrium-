const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Terrium API',
      version: '1.0.0',
      description: `
## Plataforma de Inteligencia Inmobiliaria para CABA

API REST + GraphQL para consultar precios, tendencias y valuaciones del mercado inmobiliario de Buenos Aires.

### Autenticación
La mayoría de los endpoints requieren un token **JWT Bearer**.
\`\`\`
Authorization: Bearer <token>
\`\`\`
Obtené tu token en **POST /api/auth/login** o **POST /api/auth/register**.

### Tiers de suscripción
| Tier       | Funcionalidades                                          |
|------------|----------------------------------------------------------|
| FREE       | Búsqueda básica, datos de mercado, calculadora ROI       |
| BASIC      | + Historial de precios, valuaciones, alertas             |
| PRO        | + Heatmap, analytics avanzado, acceso a la API          |
| ENTERPRISE | + White-label, soporte 24/7, requests ilimitados         |
      `
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Desarrollo local' },
      { url: 'https://api.terrium.ar', description: 'Producción' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Juan Pérez' },
                email: { type: 'string', format: 'email' },
                tier: { type: 'string', enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] }
              }
            }
          }
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            price_usd: { type: 'number' },
            price_ars: { type: 'number' },
            surface_m2: { type: 'number' },
            rooms: { type: 'integer' },
            type: { type: 'string', enum: ['DEPARTAMENTO', 'CASA', 'PH', 'OFICINA', 'LOCAL', 'TERRENO'] },
            neighborhood: { type: 'string', example: 'Palermo' },
            address: { type: 'string' },
            lat: { type: 'number' },
            lng: { type: 'number' },
            status: { type: 'string', enum: ['ACTIVO', 'PAUSADO', 'VENDIDO', 'ALQUILADO'] }
          }
        },
        Favorite: {
          type: 'object',
          properties: {
            listingId: { type: 'integer', example: 42 },
            savedAt: { type: 'string', format: 'date-time' }
          }
        },
        MarketOverview: {
          type: 'object',
          properties: {
            totalListings: { type: 'integer' },
            avgPriceUsdM2: { type: 'number' },
            topNeighborhood: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Mensaje de error descriptivo' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Registro, login y OAuth' },
      { name: 'Listings', description: 'Gestión de propiedades' },
      { name: 'Valuations', description: 'Valuaciones automáticas de propiedades' },
      { name: 'Analytics', description: 'Datos de mercado y tendencias' },
      { name: 'Favorites', description: 'Propiedades guardadas (MongoDB)' },
      { name: 'Subscriptions', description: 'Planes y suscripciones' },
      { name: 'Notifications', description: 'Notificaciones del usuario' }
    ]
  },
  apis: ['./src/swagger-docs/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
