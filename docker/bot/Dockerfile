FROM node:16.13-alpine AS builder

RUN apk add build-base

RUN wget -O - https://github.com/jemalloc/jemalloc/releases/download/5.2.1/jemalloc-5.2.1.tar.bz2 | tar -xj && \
  cd jemalloc-5.2.1 && \
  ./configure && \
  make && \
  make install

FROM node:16.13-alpine

RUN ln -sf pkgconf /usr/bin/pkg-config

ENV CXXFLAGS="-w"

RUN apk add git python3 g++ curl make pkgconf

WORKDIR /opt/parallel/bot

COPY ./ ./

RUN rm -rf node_modules

COPY --from=builder /usr/local/lib/libjemalloc.so.2 /usr/local/lib

ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so.2

RUN npm ci

CMD [ "node", "." ]