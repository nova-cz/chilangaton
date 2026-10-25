# Distribución · Línea 4

S2 y S3 generan resultados offline desde datos locales, sin cargar pandas/DuckDB en la API. El panel S4/S6 consume esos JSON: las cifras de S2 son observadas con zonas aproximadas; el impacto de S3 es SIMULADO. Los arcos muestran promedios por zona, no viajes individuales. El círculo de disponibilidad agrupa Buenavista y San Rafael.

## API de simulación

- `GET /api/v1/contraflujo`
- `GET /api/v1/simulation/results?scenario=10&recovered=false` (sin `scenario`, devuelve 0/5/10/20).
- Un escenario inválido responde 422 con `error.code=validation_error`.

### Estaciones incluidas en S3

Se exige capacidad positiva y que `is_installed`, `is_renting` e `is_returning` sean verdaderas en el snapshot inicial. Un flag nulo se trata como no operativo. Las estaciones excluidas no cuentan como vacías/llenas, no son alternativas ni destinos de misiones y sus bicis no se recuperan. Los viajes que las tocan se excluyen de la reproducción; no se contabilizan como demanda insatisfecha.

El JSON regenerado usa 672 estaciones (5 excluidas) y reproduce 14,344 de 14,404 viajes de la ventana (60 excluidos). Buenavista/San Rafael conservan 27 estaciones, equivalentes a 81 horas estación posibles. A 0% y 20% sin recuperación previa, las horas vacías son 35.87 y 35.04. Son resultados del modelo, no mediciones de impacto real. El estado operativo del inventario inicial se mantiene fijo durante la ventana; no se modelan cierres posteriores.

## S5 · Motor y API DEMO

Solo con `DEMO_MODE=true`. La interfaz `/app/mision` sigue siendo la maqueta local; estos endpoints permiten probar las reglas del servidor desde `/docs`. No verifica viajes, desbloqueos o estaciones oficiales. El hash y la matrícula son identificadores de prueba, no autenticación. No introducir datos personales ni matrículas reales.

1. `GET /api/v1/missions?user_hash=demo-user-123` devuelve catálogo, cotizaciones y ledger de esa identidad DEMO.
2. `POST /api/v1/missions/demo-mision-3/accept` con `{"user_hash":"demo-user-123","bike_id":"demo-bike-1","request_id":"accept-1"}` simula el desbloqueo. Guarda el `acceptance.id` devuelto; `frozen_reward` no cambia después.
3. `POST /api/v1/missions/demo-mision-3/complete` con `{"user_hash":"demo-user-123","acceptance_id":"<id devuelto>","request_id":"complete-1","station_ids":["demo-10","demo-03"]}` simula la entrega punta a punta. No se acredita hasta esta entrega.

Una repetición idéntica, incluso con otra clave, no duplica el pago. Reutilizar `request_id` con otro contenido devuelve 409. Una persona o bici solo puede tener una misión en curso. Las estaciones cerradas, sin capacidad, sin bici en origen o sin anclaje en destino no se ofrecen ni aceptan.

Un recorrido `A → B → A` no acredita puntos. Si se divide en dos misiones con la misma identidad y bici, el retorno revierte el primer crédito mediante una entrada negativa, dejando cero puntos netos. Esta regla abarca el historial en memoria de la sesión del servidor, sin ventana temporal. No equivale a detección real de abuso.

Parámetros propuestos y visibles en `policy`: 100 puntos equivalen a 1 día virtual; peso 1.25 para Buenavista y 1.15 para San Rafael; bono de 20 puntos por estación nueva. **Solo como supuesto DEMO**, `demo-02` se considera nueva. Las ventanas del catálogo son ejemplos, no verificaciones de la hora de un viaje oficial. Los estados completado/bloqueado de la maqueta no se usan como historial real del servidor.

Almacenamiento en memoria, con un lock para evitar doble pago concurrente. El estado se pierde al reiniciar y no se comparte entre procesos: usar un único worker para esta demo. No hay canje real. Antes de activar escrituras fuera de DEMO faltan identidad verificada, persistencia transaccional y datos del operador.

## Verificación

Desde la raíz: `.venv/bin/python -m pytest`. Prueba reproducibilidad e inventario del simulador, validación HTTP y reglas de misiones (incluyendo concurrencia, repetición, retorno y estaciones no elegibles).
