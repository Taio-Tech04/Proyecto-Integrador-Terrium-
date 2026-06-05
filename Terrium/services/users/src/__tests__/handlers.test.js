const registerHandlers = require('../../../shared/utils/handlers');

describe('registerHandlers', () => {
  let app;
  let logger;

  beforeEach(() => {
    app = { use: jest.fn() };
    logger = { error: jest.fn() };
  });

  it('registra exactamente dos middlewares (404 y error handler)', () => {
    registerHandlers(app, logger);
    expect(app.use).toHaveBeenCalledTimes(2);
  });

  it('el handler 404 responde con status 404 y mensaje correcto', () => {
    registerHandlers(app, logger);
    const notFoundHandler = app.use.mock.calls[0][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    notFoundHandler({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Ruta no encontrada' });
  });

  it('el error handler responde con status 500 y loguea el stack del error', () => {
    registerHandlers(app, logger, 'Fallo controlado');
    const errorHandler = app.use.mock.calls[1][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const err = new Error('algo falló');
    errorHandler(err, {}, res, jest.fn());
    expect(logger.error).toHaveBeenCalledWith(err.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Fallo controlado' });
  });

  it('usa el mensaje de error por defecto cuando no se provee uno', () => {
    registerHandlers(app, logger);
    const errorHandler = app.use.mock.calls[1][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(new Error('x'), {}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno' });
  });

  it('loguea el string del error cuando no es una instancia de Error', () => {
    registerHandlers(app, logger);
    const errorHandler = app.use.mock.calls[1][0];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler('error string', {}, res, jest.fn());
    expect(logger.error).toHaveBeenCalledWith('error string');
  });
});
