const listingTypeDefs = `
  type Listing {
    id: ID!
    title: String!
    description: String
    priceUsd: Float!
    priceArs: Float
    surfaceM2: Float!
    rooms: Int
    type: ListingType!
    neighborhood: String!
    lat: Float
    lng: Float
    status: ListingStatus!
    ownerId: String!
    createdAt: String!
  }

  enum ListingType { DEPARTAMENTO CASA PH OFICINA LOCAL TERRENO }
  enum ListingStatus { ACTIVO PAUSADO VENDIDO ALQUILADO }

  input ListingFilter {
    type: ListingType
    neighborhood: String
    minPrice: Float
    maxPrice: Float
    minSurface: Float
    rooms: Int
  }

  extend type Query {
    listings(filter: ListingFilter, page: Int, limit: Int): [Listing!]!
    listing(id: ID!): Listing
  }

  extend type Mutation {
    createListing(input: CreateListingInput!): Listing!
    updateListing(id: ID!, input: UpdateListingInput!): Listing!
    deleteListing(id: ID!): Boolean!
  }

  input CreateListingInput {
    title: String!
    description: String
    priceUsd: Float!
    surfaceM2: Float!
    rooms: Int
    type: ListingType!
    neighborhood: String!
    lat: Float
    lng: Float
  }

  input UpdateListingInput {
    title: String
    description: String
    priceUsd: Float
    surfaceM2: Float
    rooms: Int
    status: ListingStatus
  }
`;

const valuationTypeDefs = `
  type Valuation {
    id: ID!
    propertyId: String!
    priceUsdM2: Float!
    priceArsM2: Float
    estimatedValue: Float!
    confidenceScore: Float!
    method: String!
    calculatedAt: String!
  }

  type PriceHistory {
    neighborhood: String!
    month: Int!
    year: Int!
    avgPriceUsdM2: Float!
    totalListings: Int!
  }

  extend type Query {
    valuation(propertyId: ID!): Valuation
    priceHistory(neighborhood: String!, months: Int): [PriceHistory!]!
  }

  extend type Mutation {
    requestValuation(propertyId: ID!): Valuation!
  }
`;

const analyticsTypeDefs = `
  type MarketMetric {
    neighborhood: String!
    avgPriceM2: Float!
    totalListings: Int!
    medianDaysListed: Float
    month: Int!
    year: Int!
  }

  type HeatmapPoint {
    lat: Float!
    lng: Float!
    intensity: Float!
    neighborhood: String!
    avgPriceUsdM2: Float!
  }

  type InvestmentScore {
    neighborhood: String!
    score: Float!
    yieldPct: Float!
    trend: String!
    recommendation: String!
  }

  extend type Query {
    marketTrends(months: Int): [MarketMetric!]!
    heatmapData: [HeatmapPoint!]!
    investmentScore(neighborhood: String!): InvestmentScore
    neighborhoodRanking: [InvestmentScore!]!
  }
`;

const userTypeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    tier: String!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SubscriptionPlan {
    tier: String!
    priceArs: Float!
    features: [String!]!
  }

  extend type Query {
    me: User
    subscriptionPlans: [SubscriptionPlan!]!
  }

  extend type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    upgradeSubscription(tier: String!): User!
  }
`;

const baseTypeDefs = `
  type Query
  type Mutation
`;

const typeDefs = [baseTypeDefs, listingTypeDefs, valuationTypeDefs, analyticsTypeDefs, userTypeDefs];

module.exports = { typeDefs };
