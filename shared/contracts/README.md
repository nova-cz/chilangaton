# Contratos entre líneas

Cada contrato lo publica **su dueño** (ver tabla en el plan unificado): `cX_nombre.py` (Pydantic), `cX_nombre.ts` (tipo TS) y `cX_nombre.example.json`.
Reglas del día: campos nuevos solo opcionales; nunca renombrar ni quitar. Los fixtures de `shared/fixtures/` **no** son contratos.

**Ids de estación:** la llave para unir entre líneas es el código CE (`short_name`). Ver [`station_ids.md`](station_ids.md).
