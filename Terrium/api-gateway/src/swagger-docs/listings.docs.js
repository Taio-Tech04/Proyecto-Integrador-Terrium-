/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Listar propiedades con filtros
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPARTAMENTO, CASA, PH, OFICINA, LOCAL, TERRENO]
 *         description: Tipo de propiedad
 *       - in: query
 *         name: neighborhood
 *         schema:
 *           type: string
 *           example: Palermo
 *         description: Barrio
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           example: 50000
 *         description: Precio mínimo en USD
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           example: 300000
 *         description: Precio máximo en USD
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Resultados por página
 *     responses:
 *       200:
 *         description: Lista de propiedades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *       401:
 *         description: No autenticado
 *
 *   post:
 *     summary: Publicar una nueva propiedad
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price_usd, surface_m2, type, neighborhood]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Hermoso departamento en Palermo
 *               description:
 *                 type: string
 *               price_usd:
 *                 type: number
 *                 example: 125000
 *               price_ars:
 *                 type: number
 *                 example: 130000000
 *               surface_m2:
 *                 type: number
 *                 example: 65
 *               rooms:
 *                 type: integer
 *                 example: 3
 *               type:
 *                 type: string
 *                 enum: [DEPARTAMENTO, CASA, PH, OFICINA, LOCAL, TERRENO]
 *               neighborhood:
 *                 type: string
 *                 example: Palermo
 *               address:
 *                 type: string
 *                 example: Av. Santa Fe 3500
 *     responses:
 *       201:
 *         description: Propiedad creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       401:
 *         description: No autenticado
 *
 * /api/listings/{id}:
 *   get:
 *     summary: Obtener una propiedad por ID
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la propiedad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Propiedad no encontrada
 *
 *   put:
 *     summary: Actualizar una propiedad
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Listing'
 *     responses:
 *       200:
 *         description: Propiedad actualizada
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Propiedad no encontrada
 *
 *   delete:
 *     summary: Eliminar una propiedad
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Propiedad eliminada
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Propiedad no encontrada
 */
