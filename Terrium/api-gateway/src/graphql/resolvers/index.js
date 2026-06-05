const axios = require('axios');
const config = require('../../config');

const makeRequest = async (url, options = {}) => {
  const { data } = await axios({ url, ...options, timeout: 5000 });
  return data;
};

// ─── Resolvers unificados en un solo objeto (requerido por Apollo Server v4) ───
const resolvers = {
  // ── Field-level resolvers para mapear snake_case (BD/REST) → camelCase (GraphQL) ──
  Listing: {
    priceUsd:   (p) => p.price_usd   ?? p.priceUsd,
    priceArs:   (p) => p.price_ars   ?? p.priceArs   ?? null,
    surfaceM2:  (p) => p.surface_m2  ?? p.surfaceM2,
    ownerId:    (p) => p.owner_id    ?? p.ownerId    ?? null,
    createdAt:  (p) => p.created_at  ?? p.createdAt,
  },

  Valuation: {
    propertyId:     (p) => p.listing_id      ?? p.propertyId,
    priceUsdM2:     (p) => p.price_per_m2    ?? p.priceUsdM2,
    priceArsM2:     (p) => p.price_ars_m2    ?? p.priceArsM2    ?? null,
    estimatedValue: (p) => p.estimated_price ?? p.estimatedValue,
    confidenceScore:(p) => p.confidence      ?? p.confidenceScore,
    calculatedAt:   (p) => p.created_at      ?? p.calculatedAt,
  },

  User: {
    createdAt: (p) => p.created_at ?? p.createdAt,
  },

  MarketMetric: {
    avgPriceM2:       (p) => p.avg_price_usd_m2  ?? p.avgPriceM2,
    totalListings:    (p) => p.total_listings     ?? p.totalListings,
    medianDaysListed: (p) => p.median_days_listed ?? p.medianDaysListed ?? null,
  },

  PriceHistory: {
    avgPriceUsdM2: (p) => p.avg_price_usd_m2 ?? p.avgPriceUsdM2,
    totalListings: (p) => p.total_listings    ?? p.totalListings,
  },

  InvestmentScore: {
    yieldPct: (p) => p.yield_pct ?? p.yieldPct,
  },

  Query: {
    // Listings — la API REST devuelve { data: [], total, page, limit }
    listings: async (_root, { filter = {}, page = 1, limit = 20 }) => {
      const params = new URLSearchParams({ page, limit, ...filter }).toString();
      const response = await makeRequest(`${config.LISTINGS_URL}/?${params}`);
      // La respuesta REST es { data: [...], total, page, limit }
      return Array.isArray(response) ? response : (response.data || []);
    },
    listing: async (_root, { id }) => makeRequest(`${config.LISTINGS_URL}/${id}`),

    // Valuations
    valuation: async (_root, { propertyId }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.VALUATIONS_URL}/property/${propertyId}`);
    },
    priceHistory: async (_root, { neighborhood, months = 12 }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(user.tier)) {
        throw new Error('Se requiere plan BASIC o superior');
      }
      return makeRequest(`${config.VALUATIONS_URL}/history/${neighborhood}?months=${months}`);
    },

    // Analytics
    marketTrends: async (_root, { months = 6 }) =>
      makeRequest(`${config.ANALYTICS_URL}/trends?months=${months}`),
    heatmapData: async (_root, _args, { user }) => {
      if (!['PRO', 'ENTERPRISE'].includes(user?.tier)) {
        throw new Error('Se requiere plan PRO o superior para acceder al mapa de calor');
      }
      return makeRequest(`${config.ANALYTICS_URL}/heatmap`);
    },
    investmentScore: async (_root, { neighborhood }) =>
      makeRequest(`${config.ANALYTICS_URL}/score/${neighborhood}`),
    neighborhoodRanking: async () => makeRequest(`${config.ANALYTICS_URL}/ranking`),

    // Users
    me: async (_root, _args, { user }) => {
      if (!user) throw new Error('No autenticado');
      return makeRequest(`${config.USERS_URL}/users/${user.userId}`);
    },
    subscriptionPlans: async () => makeRequest(`${config.USERS_URL}/subscriptions/plans`)
  },

  Mutation: {
    // Listings
    createListing: async (_root, { input }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.LISTINGS_URL}/`, {
        method: 'POST',
        data: input,
        headers: { 'x-user-id': user.userId, 'x-user-tier': user.tier }
      });
    },
    updateListing: async (_root, { id, input }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.LISTINGS_URL}/${id}`, { method: 'PUT', data: input });
    },
    deleteListing: async (_root, { id }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      await makeRequest(`${config.LISTINGS_URL}/${id}`, { method: 'DELETE' });
      return true;
    },

    // Valuations — primero obtenemos los datos del listing para poder llamar a /estimate
    requestValuation: async (_root, { propertyId }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      // Obtener detalles del listing para extraer neighborhood y surfaceM2
      const listing = await makeRequest(`${config.LISTINGS_URL}/${propertyId}`);
      return makeRequest(`${config.VALUATIONS_URL}/estimate`, {
        method: 'POST',
        data: {
          listingId:  propertyId,
          neighborhood: listing.neighborhood,
          surfaceM2:    listing.surface_m2 ?? listing.surfaceM2
        }
      });
    },

    // Users
    register: async (_root, { name, email, password }) =>
      makeRequest(`${config.USERS_URL}/auth/register`, {
        method: 'POST',
        data: { name, email, password }
      }),
    login: async (_root, { email, password }) =>
      makeRequest(`${config.USERS_URL}/auth/login`, {
        method: 'POST',
        data: { email, password }
      }),
    upgradeSubscription: async (_root, { tier }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.USERS_URL}/subscriptions/upgrade`, {
        method: 'POST',
        data: { tier },
        headers: { 'x-user-id': user.userId }
      });
    }
  }
};

module.exports = { resolvers };
