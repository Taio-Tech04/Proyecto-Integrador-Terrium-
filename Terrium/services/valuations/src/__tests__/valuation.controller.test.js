const { surfaceAdjustmentFactor } = require('../controllers/valuation.controller');

describe('surfaceAdjustmentFactor', () => {
  it('retorna 1.08 para propiedades muy pequeñas (<=30m²)', () => {
    expect(surfaceAdjustmentFactor(20)).toBe(1.08);
    expect(surfaceAdjustmentFactor(30)).toBe(1.08);
  });

  it('retorna 1.04 para propiedades pequeñas (31–60m²)', () => {
    expect(surfaceAdjustmentFactor(31)).toBe(1.04);
    expect(surfaceAdjustmentFactor(60)).toBe(1.04);
  });

  it('retorna 1.00 para propiedades medianas (61–100m²)', () => {
    expect(surfaceAdjustmentFactor(61)).toBe(1.00);
    expect(surfaceAdjustmentFactor(100)).toBe(1.00);
  });

  it('retorna 0.97 para propiedades grandes (101–200m²)', () => {
    expect(surfaceAdjustmentFactor(101)).toBe(0.97);
    expect(surfaceAdjustmentFactor(200)).toBe(0.97);
  });

  it('retorna 0.92 para propiedades muy grandes (>200m²)', () => {
    expect(surfaceAdjustmentFactor(201)).toBe(0.92);
    expect(surfaceAdjustmentFactor(500)).toBe(0.92);
  });

  it('el factor nunca produce un precio negativo', () => {
    [10, 50, 80, 150, 300].forEach((m2) => {
      expect(surfaceAdjustmentFactor(m2)).toBeGreaterThan(0);
    });
  });

  it('el factor está siempre dentro del rango [0.92, 1.08]', () => {
    [1, 30, 31, 60, 61, 100, 101, 200, 201, 1000].forEach((m2) => {
      const f = surfaceAdjustmentFactor(m2);
      expect(f).toBeGreaterThanOrEqual(0.92);
      expect(f).toBeLessThanOrEqual(1.08);
    });
  });
});

describe('estimate — lógica de confianza', () => {
  const buildReq = (body) => ({ body, headers: {} });
  const buildRes = () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  };

  beforeEach(() => {
    jest.resetModules();
  });

  it('confidence es 0.60 cuando no hay datos reales y superficie es razonable', async () => {
    jest.mock('../db/connection', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    }));
    const { estimate } = require('../controllers/valuation.controller');
    const req = buildReq({ neighborhood: 'Palermo', surfaceM2: 80 });
    const res = buildRes();

    await estimate(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ confidence: 0.60, method: 'RULE_BASED' })
    );
  });

  it('confidence es 0.45 cuando no hay datos reales y superficie es fuera de rango', async () => {
    jest.mock('../db/connection', () => ({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    }));
    const { estimate } = require('../controllers/valuation.controller');
    const req = buildReq({ neighborhood: 'Palermo', surfaceM2: 1500 });
    const res = buildRes();

    await estimate(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ confidence: 0.45 })
    );
  });

  it('retorna 400 si falta neighborhood', async () => {
    jest.mock('../db/connection', () => ({ query: jest.fn() }));
    const { estimate } = require('../controllers/valuation.controller');
    const req = buildReq({ surfaceM2: 80 });
    const res = buildRes();

    await estimate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'neighborhood y surfaceM2 son requeridos' });
  });

  it('retorna 400 si falta surfaceM2', async () => {
    jest.mock('../db/connection', () => ({ query: jest.fn() }));
    const { estimate } = require('../controllers/valuation.controller');
    const req = buildReq({ neighborhood: 'Palermo' });
    const res = buildRes();

    await estimate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'neighborhood y surfaceM2 son requeridos' });
  });
});
