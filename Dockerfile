FROM node:fermium

# install borg via pip because the ubuntu repo version is usually out of date
RUN apt update \
  && apt install -y python3 python3-pip libacl1-dev libacl1 \
  && rm -rf /var/lib/apt/lists/*
RUN pip3 install -U setuptools wheel
RUN pip3 install borgbackup

WORKDIR /borg-prometheus-collector

COPY ./package.json ./yarn.lock ./
RUN yarn install

COPY ./tsconfig.json ./
COPY ./src ./src/
RUN yarn build

EXPOSE 3000
CMD yarn start
