FROM debian:bookworm-slim AS godot-builder
ARG GODOT_VERSION=4.7.2-stable
WORKDIR /tmp/godot
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget unzip libfontconfig1 libx11-6 libxcursor1 libxinerama1 libxrandr2 libxi6 libgl1 libpulse0 libasound2 libwayland-client0 && rm -rf /var/lib/apt/lists/*
RUN wget -q "https://godot-releases.nbg1.your-objectstorage.com/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64.zip" -O godot.zip \
 && unzip -q godot.zip \
 && mv Godot_v4.7.2-stable_linux.x86_64 /usr/local/bin/godot \
 && chmod +x /usr/local/bin/godot \
 && wget -q "https://godot-releases.nbg1.your-objectstorage.com/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz" -O templates.tpz \
 && mkdir -p /root/.local/share/godot/export_templates/4.7.2.stable /tmp/godot-templates \
 && unzip -q templates.tpz -d /tmp/godot-templates \
 && release_template=$(find /tmp/godot-templates -type f -name 'web_nothreads_release.zip' | head -n 1) \
 && debug_template=$(find /tmp/godot-templates -type f -name 'web_nothreads_debug.zip' | head -n 1) \
 && test -n "$release_template" \
 && test -n "$debug_template" \
 && cp "$release_template" /root/.local/share/godot/export_templates/4.7.2.stable/web_nothreads_release.zip \
 && cp "$debug_template" /root/.local/share/godot/export_templates/4.7.2.stable/web_nothreads_debug.zip
 && unzip -q templates.tpz -d /tmp/godot-templates \
 && find /tmp/godot-templates -type f -name 'web_nothreads_release.zip' -exec cp {} /root/.local/share/godot/export_templates/4.7.2.stable/ \\; \
 && find /tmp/godot-templates -type f -name 'web_nothreads_debug.zip' -exec cp {} /root/.local/share/godot/export_templates/4.7.2.stable/ \\; \
 && ls -la /root/.local/share/godot/export_templates/4.7.2.stable
WORKDIR /src
COPY godot ./godot
RUN mkdir -p godot/build  && godot --headless --path godot --editor --quit  && godot --headless --path godot --export-release "Web" build/index.html  && test -f godot/build/index.html

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=godot-builder /src/godot/build ./public/game-engine
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts/migrate.js ./migrate.js
EXPOSE 3000
CMD ["sh", "-c", "node migrate.js && node server.js"]
