const mongoose = require('mongoose');

// Esquema flexible para favoritos: cada usuario tiene una lista de propiedades guardadas.
// MongoDB es ideal aquí por su modelo documental — no hace falta un JOIN para obtener
// todos los favoritos de un usuario, es un documento que agrupa toda la información.
const favoriteSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    listingId: { type: Number, required: true }
  },
  { timestamps: { createdAt: 'savedAt', updatedAt: false } }
);

// Índice compuesto: un usuario no puede tener dos veces el mismo favorito
favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
