FROM lgatica/node-zmq

#RUN apt-get update
#RUN apt-get install git -y
RUN apk add --no-cache git

COPY ./server /var/crypto-live
WORKDIR /var/crypto-live

RUN npm install
RUN npm rebuild zeromq

RUN echo "#!/bin/bash" > /usr/bin/crypto-live-server
RUN echo "node /var/crypto-live/bin/server.js $@" >> /usr/bin/crypto-live-server

CMD [ 'crypto-live-server' ]
ENTRYPOINT ["node", "/var/crypto-live/bin/server.js", "/var/config.json"];