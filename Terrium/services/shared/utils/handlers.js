/**
 * Registra los handlers de 404 y error global en la app Express.
 * @param {import('express').Application} app
 * @param {object} logger
 * @param {string} [errorMessage]
 */
function registerHandlers(app, logger, errorMessage = 'Error interno') {
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  /** @type {import('express').ErrorRequestHandler} */
  const errorHandler = (err, _req, res, _next) => {
    logger.error(err instanceof Error ? err.stack : String(err));
    res.status(500).json({ error: errorMessage });
  };
  app.use(errorHandler);
}

module.exports = registerHandlers;
