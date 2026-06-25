# Recomendaciones — Modo Inversor y Modo Vendedor

> Documento de producto/UX para evolucionar las dos páginas principales de Terrium.
> Generado junto con la nueva **Guía del Inversor** (`investor-guide.html`).

---

## 🟡 Modo Inversor

### Quick wins (alto impacto, bajo esfuerzo)
1. **Guía del Inversor (✅ hecha)** — `investor-guide.html`: onboarding educativo + mapa a 10 años. Ya está enlazada en navbar y sidebar. Sirve de imán SEO y de "primer paso" para el debutante.
2. **CTA contextual a la Guía** en el dashboard: cuando el usuario es FREE o nuevo, mostrar un banner "¿Primera vez invirtiendo? Empezá por la Guía".
3. **Tooltips de conceptos** en el dashboard y la calculadora: un `?` al lado de "Rentabilidad", "Score", "USD/m²" que explique el término (reusar el glosario de la guía).
4. **Estado vacío con sentido**: si un barrio no tiene datos, mostrar el fallback + link a la guía en vez de un "—".

### Mejoras de producto (mediano plazo)
5. **Comparador de barrios**: seleccionar 2-3 barrios y verlos lado a lado (precio m², score, renta, tendencia). Es la pregunta #1 del inversor.
6. **Watchlist / favoritos de barrios**: ya existe la tabla `favorito`; extenderla a barrios y alertar cuando cambian de precio/score.
7. **Simulador a 10 años**: en la calculadora, proyectar valor futuro combinando renta + revalorización estimada por tier (los tiers ya están definidos en la guía).
8. **Alertas de oportunidad**: notificar (vía servicio notifications) cuando aparece una propiedad por debajo del USD/m² promedio de su barrio.
9. **Niveles de la guía por tier de plan**: contenido básico FREE, simulador y comparador avanzado para PRO.

### Confianza / credibilidad
10. **Badge de origen de datos** (ya existe `data_source`): mostrarlo más visible y explicar qué significa cada fuente.
11. **Fecha de actualización** clara en cada métrica.
12. **Disclaimer** consistente (la guía ya lo tiene): "contenido educativo, no asesoramiento financiero".

---

## 🟢 Modo Vendedor

### Quick wins
1. **Mostrar la valuación antes de pedir registro**: dejar que el vendedor vea un rango estimado y pedir el email para "el informe completo". Reduce fricción.
2. **Barra de progreso en `seller-publish`**: el form es largo (598 líneas); dividir en pasos (1. Datos → 2. Fotos → 3. Precio → 4. Publicar) con barra de avance.
3. **Sugerencia de precio en vivo**: al cargar barrio + m² en la publicación, mostrar el "precio justo" sugerido (reusa el servicio de valuations) y avisar si el precio cargado está fuera de rango.
4. **Checklist de "publicación de calidad"**: fotos, descripción, precio competitivo → puntaje que incentive completar.

### Mejoras de producto
5. **Panel de rendimiento real** (`seller-dashboard`): vistas, contactos y comparación contra el promedio del barrio, con mini-gráficos. Hoy el hero muestra datos mockeados (1.247 vistas, etc.) — conectarlos a datos reales (tabla `publicacion.views_count`, `consulta`).
6. **Termómetro de precio**: indicador visual "tu precio vs. mercado" (por debajo / justo / por encima) que actualiza la probabilidad de venta y los días estimados.
7. **Bandeja de consultas**: la tabla `consulta` ya existe; darle una UI para responder a interesados desde la plataforma.
8. **Recomendaciones automáticas**: "Bajá un 3% para entrar en el rango más buscado" / "Agregá 2 fotos más: las publicaciones con +6 fotos reciben 40% más consultas".
9. **Sugerencia de timing**: usar datos de mercado para sugerir el mejor momento de publicar/ajustar precio.

### Confianza
10. **Reemplazar métricas inventadas** del hero y testimonios por datos/casos reales o etiquetarlos como ilustrativos.
11. **Transparencia de comisiones** (ya se promete "sin comisiones ocultas"): hacerlo explícito con un desglose.

---

## 🔗 Transversales (ambos modos)
- **Mode-switcher persistente**: recordar en qué modo entró el usuario (localStorage) y respetar su preferencia.
- **Onboarding por rol** al registrarse: "¿Querés invertir o vender?" → llevar al modo correcto.
- **Consistencia de navbar**: el link a la Guía ya se agregó en el modo inversor; evaluar un equivalente "Guía para vender" en el modo vendedor.
- **Performance**: las páginas ya cargan fuentes con `media=print` (bien). Mantener imágenes optimizadas y `defer` en scripts.
- **Accesibilidad**: roles ARIA en los toggles (la guía ya los usa en el checklist), foco visible y contraste en los textos sobre fondos navy/verde.

---

### Prioridad sugerida (primeras 5)
1. Guía del Inversor (✅) + CTA contextual en dashboard.
2. Valuación visible antes del registro (vendedor).
3. Sugerencia de precio en vivo al publicar (vendedor).
4. Comparador de barrios (inversor).
5. Panel de rendimiento con datos reales (vendedor).
