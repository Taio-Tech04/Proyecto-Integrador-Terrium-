const axios = require('axios');
const config = require('../../config');

const makeRequest = async (url, options = {}) => {
  const { data } = await axios({ url, ...options, timeout: 5000 });
  return data;
};

const listingResolvers = {
  Query: {
    listings: async (_, { filter = {}, page = 1, limit = 20 }, { user }) => {
      const params = new URLSearchParams({ page, limit, ...filter }).toString();
      return makeRequest(`${config.LISTINGS_URL}/?${params}`);
    },
    listing: async (_, { id }) => makeRequest(`${config.LISTINGS_URL}/${id}`)
  },
  Mutation: {
    createListing: async (_, { input }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.LISTINGS_URL}/`, {
        method: 'POST',
        data: input,
        headers: { 'x-user-id': user.userId, 'x-user-tier': user.tier }
      });
    },
    updateListing: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.LISTINGS_URL}/${id}`, { method: 'PUT', data: input });
    },
    deleteListing: async (_, { id }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      await makeRequest(`${config.LISTINGS_URL}/${id}`, { method: 'DELETE' });
      return true;
    }
  }
};

const valuationResolvers = {
  Query: {
    valuation: async (_, { propertyId }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.VALUATIONS_URL}/property/${propertyId}`);
    },
    priceHistory: async (_, { neighborhood, months = 12 }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      const tier = user?.tier;
      if (!['INVERSOR', 'PRO', 'ENTERPRISE'].includes(tier)) {
        throw new Error('Se requiere plan INVERSOR o superior');
      }
      return makeRequest(`${config.VALUATIONS_URL}/history/${neighborhood}?months=${months}`);
    }
  },
  Mutation: {
    requestValuation: async (_, { propertyId }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.VALUATIONS_URL}/estimate`, { method: 'POST', data: { propertyId } });
    }
  }
};

const analyticsResolvers = {
  Query: {
    marketTrends: async (_, { months = 6 }) => makeRequest(`${config.ANALYTICS_URL}/trends?months=${months}`),
    heatmapData: async (_, __, { user }) => {
      if (!['PRO', 'ENTERPRISE'].includes(user?.tier)) {
        throw new Error('Se requiere plan PRO o superior para acceder al mapa de calor');
      }
      return makeRequest(`${config.ANALYTICS_URL}/heatmap`);
    },
    investmentScore: async (_, { neighborhood }) => makeRequest(`${config.ANALYTICS_URL}/score/${neighborhood}`),
    neighborhoodRanking: async () => makeRequest(`${config.ANALYTICS_URL}/ranking`)
  }
};

const userResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('No autenticado');
      return makeRequest(`${config.USERS_URL}/users/${user.userId}`);
    },
    subscriptionPlans: async () => makeRequest(`${config.USERS_URL}/subscriptions/plans`)
  },
  Mutation: {
    register: async (_, { name, email, password }) => {
      return makeRequest(`${config.USERS_URL}/auth/register`, { method: 'POST', data: { name, email, password } });
    },
    login: async (_, { email, password }) => {
      return makeRequest(`${config.USERS_URL}/auth/login`, { method: 'POST', data: { email, password } });
    },
    upgradeSubscription: async (_, { tier }, { user }) => {
      if (!user) throw new Error('Autenticación requerida');
      return makeRequest(`${config.USERS_URL}/subscriptions/upgrade`, {
        method: 'POST',
        data: { tier },
        headers: { 'x-user-id': user.userId }
      });
    }
  }
};

const resolvers = [listingResolvers, valuationResolvers, analyticsResolvers, userResolvers];
module.exports = { resolvers };

