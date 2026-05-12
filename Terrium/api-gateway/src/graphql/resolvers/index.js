const axios = require('axios');
const config = require('../../config');

const makeRequest = async (url, options = {}) => {
  const { data } = await axios({ url, ...options, timeout: 5000 });
  return data;
};

// ─── Resolvers unificados en un solo objeto (requerido por Apollo Server v4) ───
const resolvers = {
  Query: {
    // Listings
    listings: async (_root, { filter = {}, page = 1, limit = 20 }, { user: _user }) => {
      const params = new URLSearchParams({ page, limit, ...filter }).toString();
      return makeRequest(`${config.LISTINGS_URL}/?${params}`);
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

    // Valuations
    requestValuation: async (_root, { propertyId }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.VALUATIONS_URL}/estimate`, {
        method: 'POST',
        data: { propertyId }
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

