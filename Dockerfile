FROM node:slim

RUN apt-get update 

RUN apt-get update \
    && apt-get install --no-install-recommends -y python build-essential \
    && apt-get clean

RUN apt-get install git libzmq3-dev sudo -y

COPY ./server /var/crypto-live
WORKDIR /var/crypto-live

RUN npm install
RUN echo "#!/bin/bash" > /usr/bin/crypto-live-server
RUN echo "node /var/crypto-live/bin/server.js $@" >> /usr/bin/crypto-live-server

CMD [ 'crypto-live-server' ]
ENTRYPOINT ["node", "/var/crypto-live/bin/server.js", "/var/config.json"];