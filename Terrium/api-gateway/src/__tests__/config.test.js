const config = require('../config');

describe('Configuración del API Gateway', () => {
  it('tiene todas las URLs de microservicios definidas', () => {
    const serviceUrls = ['USERS_URL', 'LISTINGS_URL', 'VALUATIONS_URL', 'ANALYTICS_URL', 'NOTIFICATIONS_URL'];
    serviceUrls.forEach((key) => {
      expect(config[key]).toBeDefined();
      expect(typeof config[key]).toBe('string');
      expect(config[key].length).toBeGreaterThan(0);
    });
  });

  it('tiene PORT y NODE_ENV definidos', () => {
    expect(config.PORT).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
  });

  it('las URLs de servicios tienen formato http válido', () => {
    const serviceUrls = ['USERS_URL', 'LISTINGS_URL', 'VALUATIONS_URL', 'ANALYTICS_URL', 'NOTIFICATIONS_URL'];
    serviceUrls.forEach((key) => {
      expect(config[key]).toMatch(/^https?:\/\/.+/);
    });
  });
});
