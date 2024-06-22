FROM node:16.20.2-alpine@sha256:a1f9d027912b58a7c75be7716c97cfbc6d3099f3a97ed84aa490be9dee20e787 AS builder

WORKDIR /borg-prometheus-collector

COPY ./package.json ./yarn.lock ./
RUN yarn install

COPY ./tsconfig.json ./
COPY ./src ./src/
RUN yarn build

# ---

FROM node:16.20.2-alpine@sha256:a1f9d027912b58a7c75be7716c97cfbc6d3099f3a97ed84aa490be9dee20e787

WORKDIR /borg-prometheus-collector

RUN apk add --no-cache borgbackup coreutils

COPY ./package.json ./yarn.lock ./
RUN yarn install --production

COPY --from=builder /borg-prometheus-collector/build ./build/

EXPOSE 9030
CMD yarn start
