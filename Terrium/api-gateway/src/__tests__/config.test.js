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

  describe('ALLOWED_ORIGINS', () => {
    it('es un array', () => {
      expect(Array.isArray(config.ALLOWED_ORIGINS)).toBe(true);
    });

    it('contiene al menos un origen', () => {
      expect(config.ALLOWED_ORIGINS.length).toBeGreaterThan(0);
    });

    it('cada origen tiene formato http/https válido', () => {
      config.ALLOWED_ORIGINS.forEach((origin) => {
        expect(origin).toMatch(/^https?:\/\/.+/);
      });
    });

    it('parsea ALLOWED_ORIGINS desde variable de entorno con comas', () => {
      const original = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'https://terrium.app,https://www.terrium.app';
      jest.resetModules();
      const freshConfig = require('../config');
      expect(freshConfig.ALLOWED_ORIGINS).toEqual([
        'https://terrium.app',
        'https://www.terrium.app',
      ]);
      process.env.ALLOWED_ORIGINS = original;
    });

    it('trimea espacios en los orígenes parseados', () => {
      const original = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = ' https://a.com , https://b.com ';
      jest.resetModules();
      const freshConfig = require('../config');
      expect(freshConfig.ALLOWED_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
      process.env.ALLOWED_ORIGINS = original;
    });
  });
});
