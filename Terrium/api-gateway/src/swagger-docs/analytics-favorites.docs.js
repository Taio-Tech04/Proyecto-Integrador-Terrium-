/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Resumen general del mercado
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas generales del mercado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketOverview'
 *       401:
 *         description: No autenticado
 *
 * /api/analytics/trends:
 *   get:
 *     summary: Tendencias de precios por barrio
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Cantidad de meses a analizar
 *     responses:
 *       200:
 *         description: Tendencias históricas
 *       401:
 *         description: No autenticado
 *
 * /api/analytics/heatmap:
 *   get:
 *     summary: Datos para el mapa de calor (requiere tier PRO o superior)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna puntos GeoJSON con precios promedio por barrio. También disponible en tiempo real vía WebSocket (`heatmap:update`).
 *     responses:
 *       200:
 *         description: Datos GeoJSON del heatmap
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere suscripción PRO o ENTERPRISE
 *
 * /api/analytics/score/{neighborhood}:
 *   get:
 *     summary: Score de inversión de un barrio
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: neighborhood
 *         required: true
 *         schema:
 *           type: string
 *           example: Palermo
 *     responses:
 *       200:
 *         description: Score e indicadores de inversión
 *       404:
 *         description: Barrio no encontrado
 *
 * /api/analytics/ranking:
 *   get:
 *     summary: Ranking de barrios por score de inversión
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top 20 barrios ordenados por score
 *
 * /api/valuations/estimate:
 *   post:
 *     summary: Estimar precio de una propiedad
 *     tags: [Valuations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [neighborhood, surfaceM2]
 *             properties:
 *               neighborhood:
 *                 type: string
 *                 example: Palermo
 *               surfaceM2:
 *                 type: number
 *                 example: 65
 *     responses:
 *       200:
 *         description: Valuación estimada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estimatedPrice:
 *                   type: number
 *                   example: 208000
 *                 pricePerM2:
 *                   type: number
 *                   example: 3200
 *                 confidence:
 *                   type: number
 *                   example: 0.85
 *                 neighborhood:
 *                   type: string
 *       401:
 *         description: No autenticado
 *
 * /api/favorites:
 *   get:
 *     summary: Listar propiedades guardadas del usuario (MongoDB)
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       401:
 *         description: No autenticado
 *
 *   post:
 *     summary: Guardar una propiedad en favoritos (MongoDB)
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId]
 *             properties:
 *               listingId:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       201:
 *         description: Favorito guardado
 *       400:
 *         description: Ya está en favoritos
 *       401:
 *         description: No autenticado
 *
 * /api/favorites/{listingId}:
 *   delete:
 *     summary: Eliminar una propiedad de favoritos (MongoDB)
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la propiedad a eliminar de favoritos
 *     responses:
 *       200:
 *         description: Favorito eliminado
 *       404:
 *         description: Favorito no encontrado
 *       401:
 *         description: No autenticado
 */
