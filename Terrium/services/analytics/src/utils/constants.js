// noinspection NonAsciiCharacters
// Coordenadas geográficas de los barrios de CABA
const CABA_COORDS = {
  'Palermo':      { lat: -34.5889, lng: -58.4277 },
  'Belgrano':     { lat: -34.5601, lng: -58.4568 },
  'Recoleta':     { lat: -34.5875, lng: -58.3944 },
  'Puerto Madero':{ lat: -34.6118, lng: -58.3622 },
  'Villa Crespo': { lat: -34.5999, lng: -58.4433 },
  'Caballito':    { lat: -34.6189, lng: -58.4402 },
  'San Telmo':    { lat: -34.6212, lng: -58.3731 },
  'Flores':       { lat: -34.6312, lng: -58.4648 },
  'Villa Devoto': { lat: -34.6148, lng: -58.5234 },
  'Microcentro':  { lat: -34.6083, lng: -58.3712 },
  'Almagro':      { lat: -34.6064, lng: -58.4204 },
  // noinspection NonAsciiCharacters
  'Núñez':        { lat: -34.5449, lng: -58.4612 }
};

// Mapeo de nombres en minúsculas a nombre canónico (para normalizar datos externos)
const NEIGHBORHOOD_MAP = {
  'palermo': 'Palermo', 'belgrano': 'Belgrano', 'recoleta': 'Recoleta',
  'puerto madero': 'Puerto Madero', 'villa crespo': 'Villa Crespo',
  'caballito': 'Caballito', 'san telmo': 'San Telmo', 'flores': 'Flores',
  'villa devoto': 'Villa Devoto', 'microcentro': 'Microcentro',
  // noinspection NonAsciiCharacters
  'almagro': 'Almagro', 'nunez': 'Núñez', 'núñez': 'Núñez'
};

// Precios base USD/m² por barrio (referencia para estimaciones y fallback)
const BASE_PRICES = {
  'Palermo': 3200, 'Belgrano': 2900, 'Recoleta': 3500, 'Puerto Madero': 5200,
  'Villa Crespo': 2100, 'Caballito': 1900, 'San Telmo': 2200, 'Flores': 1500,
  'Villa Devoto': 1600, 'Microcentro': 1800, 'Almagro': 1700, 'Núñez': 2600
};

module.exports = { CABA_COORDS, NEIGHBORHOOD_MAP, BASE_PRICES };
