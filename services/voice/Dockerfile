FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev && npm cache clean --force
COPY tsconfig.json ./
COPY src/lib/voice.ts ./src/lib/voice.ts
COPY src/lib/voice-outcomes.ts ./src/lib/voice-outcomes.ts
COPY src/lib/plivo-connection.ts ./src/lib/plivo-connection.ts
COPY services/voice ./services/voice
ENV NODE_ENV=production VOICE_PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "services/voice/run.ts"]
