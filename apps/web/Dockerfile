# Contexto de build = raíz del repo (Railway: Root Directory vacío, Config File Path /apps/web/railway.json).
# El front importa shared/ y modules/distribucion/fixtures, por eso no se construye solo desde apps/web.
FROM node:22-alpine AS build
WORKDIR /repo
COPY apps/web/package.json apps/web/package-lock.json apps/web/
RUN cd apps/web && npm ci
COPY shared shared
COPY modules modules
COPY apps/web apps/web
# Railway pasa las variables del servicio como build args: NEXT_PUBLIC_* se fijan al compilar.
ARG NEXT_PUBLIC_DATA_MODE
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAP_STYLE_URL
ARG NEXT_PUBLIC_DEMO_AT
RUN cd apps/web && npm run build

FROM node:22-alpine
WORKDIR /repo/apps/web
ENV NODE_ENV=production
COPY --from=build /repo/apps/web ./
# next start usa $PORT que asigna Railway
CMD ["npm", "start"]
