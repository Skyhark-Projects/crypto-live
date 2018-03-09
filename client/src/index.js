const SockJS = require('sockjs-client');

class Client {
    
    constructor(config) {
        this.config         = config || {};
        this.callbacks      = [];
        this.subscriptions  = [];
        this.connectedCallbacks = [];
        this.connect();
        
        this.onConnected((socket) => {
            this.subscriptions.forEach((a) => {
                socket.send(a);
            })
        });
    }
    
    connect() {
        const socket = new SockJS(this.config.server || 'https://live.skyhark.net/');

        socket.onopen = () => {
            if(this.disconnected)
                return socket.close();
            
            this.socket = socket;

            console.log('Connected to live stream');

            this.connectedCallbacks.forEach((cb) => {
                try {
                    cb(socket);
                } catch(e) {
                    this.onError(e);
                }
            });
        };

        socket.onmessage = this.handleMessage.bind(this);

        socket.onclose = () => {
            this.socket = null;
            
            if(this.disconnected)
                return;

            console.log('ZMQ Socket connection lost', arguments);

            setTimeout(() => {
                this.connect();
            }, 500);
        };
    }

    disconnect() {
        this.disconnected = true;

        if(this.socket)
            this.socket.close();
    }
    
    onError(e) {
        console.error(e);
    }
    
    handleMessage(msg) {
        try {
            msg = msg.data || msg;

            if(typeof(msg) === 'string')
                msg = JSON.parse(msg);
            
            if(!msg.channel)
                return;

            this.callbacks.filter((o) => o.channel === msg.channel).forEach((o) => {
                try {
                    const args = msg.data || [];
                    o.cb(...args);
                } catch(e) {
                    this.onError(e);
                }
            });

        } catch(e) {
            this.onError(e);
        }
    }

    onConnected(cb) {
        this.connectedCallbacks.push(cb);

        if(this.socket) {
            try {
                cb(this.socket);
            } catch(e) {
                this.onError(e);
            }
        }
    }

    onceConnected(cb) {
        if(this.socket) {
            try {
                cb(this.socket);
            } catch(e) {
                this.onError(e);
            }
            
            return;
        }

        const self = this;
        function c(socket) {
            try {
                cb(socket);
            } catch(e) {
                this.onError(e);
            }
            
            const index = self.connectedCallbacks.indexOf(c);
            if(index !== -1)
                self.connectedCallbacks.splice(index, 1);
        }

        this.onConnected(c);
    }

    on(channel, cb) {
        this.callbacks.push({
            channel,
            cb
        });

        if(this.subscriptions.indexOf(channel) !== -1)
            return;

        this.subscriptions.push(channel);
        
        if(this.socket === null)
            return;

        this.send(channel);
    }

    once(channel, cb) {
        const scb = (a, b, c, d) => {
            cb(a, b, c, d);
            this.remove_eventListener(scb);
        };

        return this.on(channel, scb);
    }

    remove_eventListener(cb) {
        const index = this.callbacks.findIndex((o) => o.cb === cb);
        
        if(index === -1)
            return;
        
        const channel = this.callbacks[index].channel;
        this.callbacks.splice(index, 1);

        const stillUsed = this.callbacks.find((o) => o.channel === channel);

        if(stillUsed)
            return;

        const index2 = this.subscriptions.indexOf(channel);
        if(index2 !== 1)
            this.subscriptions.splice(index2, 1);

        if(this.socket === null)
            return;

        this.send('unsubscribe_' + channel);
    }
    
    send(msg) {
        this.onceConnected((socket) => {
            socket.send(msg);
        });
    }
}

module.exports = Client;