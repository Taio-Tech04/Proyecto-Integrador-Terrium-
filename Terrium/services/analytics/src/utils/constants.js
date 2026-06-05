// Fuente única de verdad para los barrios de CABA
const NEIGHBORHOODS = [
  { name: 'Palermo',       aliases: ['palermo'],                         lat: -34.5889, lng: -58.4277, basePrice: 3200 },
  { name: 'Belgrano',      aliases: ['belgrano'],                        lat: -34.5601, lng: -58.4568, basePrice: 2900 },
  { name: 'Recoleta',      aliases: ['recoleta'],                        lat: -34.5875, lng: -58.3944, basePrice: 3500 },
  { name: 'Puerto Madero', aliases: ['puerto madero'],                   lat: -34.6118, lng: -58.3622, basePrice: 5200 },
  { name: 'Villa Crespo',  aliases: ['villa crespo'],                    lat: -34.5999, lng: -58.4433, basePrice: 2100 },
  { name: 'Caballito',     aliases: ['caballito'],                       lat: -34.6189, lng: -58.4402, basePrice: 1900 },
  { name: 'San Telmo',     aliases: ['san telmo'],                       lat: -34.6212, lng: -58.3731, basePrice: 2200 },
  { name: 'Flores',        aliases: ['flores'],                          lat: -34.6312, lng: -58.4648, basePrice: 1500 },
  { name: 'Villa Devoto',  aliases: ['villa devoto'],                    lat: -34.6148, lng: -58.5234, basePrice: 1600 },
  { name: 'Microcentro',   aliases: ['microcentro'],                     lat: -34.6083, lng: -58.3712, basePrice: 1800 },
  { name: 'Almagro',       aliases: ['almagro'],                         lat: -34.6064, lng: -58.4204, basePrice: 1700 },
  { name: 'Nunez',         aliases: ['nunez', '\u00fa\u00f1ez', 'n\u00fa\u00f1ez'], lat: -34.5449, lng: -58.4612, basePrice: 2600 },
];

// Coordenadas geográficas de los barrios de CABA
const CABA_COORDS = Object.fromEntries(
  NEIGHBORHOODS.map(({ name, lat, lng }) => [name, { lat, lng }])
);

// Mapeo de nombres en minúsculas a nombre canónico (para normalizar datos externos)
const NEIGHBORHOOD_MAP = Object.fromEntries(
  NEIGHBORHOODS.flatMap(({ name, aliases }) =>
    aliases.map(alias => [alias, name])
  )
);

// Precios base USD/m² por barrio (referencia para estimaciones y fallback)
const BASE_PRICES = Object.fromEntries(
  NEIGHBORHOODS.map(({ name, basePrice }) => [name, basePrice])
);

module.exports = { NEIGHBORHOODS, CABA_COORDS, NEIGHBORHOOD_MAP, BASE_PRICES };
