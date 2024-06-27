FROM node:20.15.0-alpine@sha256:df01469346db2bf1cfc1f7261aeab86b2960efa840fe2bd46d83ff339f463665 AS builder

WORKDIR /borg-prometheus-collector

COPY ./package.json ./yarn.lock ./
RUN yarn install

COPY ./tsconfig.json ./
COPY ./src ./src/
RUN yarn build

# ---

FROM node:20.15.0-alpine@sha256:df01469346db2bf1cfc1f7261aeab86b2960efa840fe2bd46d83ff339f463665

WORKDIR /borg-prometheus-collector

RUN apk add --no-cache borgbackup coreutils

COPY ./package.json ./yarn.lock ./
RUN yarn install --production

COPY --from=builder /borg-prometheus-collector/build ./build/

EXPOSE 9030
CMD yarn start
