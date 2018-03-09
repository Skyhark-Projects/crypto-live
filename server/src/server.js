const http     = require('http');
const sockjs   = require('sockjs');
const Notifier = require('./notifier.js');
const event   = require('events').EventEmitter;

class Server extends event {
    
    constructor(config) {
        super();

        config = config || {};

        this.clients = [];

        this.echo = sockjs.createServer({ sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js' });
        this.echo.on('connection', this.onClient.bind(this));

        this.http = http.createServer();
        this.echo.installHandlers(this.http);
        this.http.listen(config.port || 9999, config.listenIp || '0.0.0.0');

        console.log('listen on port', config.port || 9999);

        this.notifiers = [];
        
        if(config.servers) {
            config.servers.forEach((o) => {
                const notifier = new Notifier(o);
                this.notifiers.push(notifier);
                this.bindNotifier(notifier, o.iso);
            });
        } else if(config.zmq) {
            const notifier = new Notifier(config);
            this.notifiers.push(notifier);
            this.bindNotifier(notifier, config.iso);
        }
    }

    onError(err) {
        this.emit('error', err);
        console.error(err);
    }

    onClient(socket) {
        this.emit('client', socket);
        this.clients.push(socket);

        socket.on('data', (message) => {
            this.onClientMessage(socket, message);
        });

        socket.on('close', (code, err) => {
            this.onClientDisconnect(socket, code, err);
        });
    }

    onClientDisconnect(socket) {
        this.emit('client-disconnected', socket);
        const index = this.clients.indexOf(socket);
        
        if(index === -1)
            return;
        
        console.log('client disconnected');
        this.clients.splice(index, 1);
    }

    onClientMessage(socket, msg) {
        this.emit('client-message', socket, msg);

        try {
            if(msg === 'unsubscribe_all')
                socket.subscriptions = null;
            else if(msg.indexOf('unsubscribe_') === 0)
                this.unsubscribe(socket, msg.substr('unsubscribe_'.length));
            else
                this.subscribe(socket, msg);
        } catch(e) {
            this.onError(e);
        }
    }

    unsubscribe(socket, channel) {
        if(!socket.subscriptions)
            return;
        
        const index = socket.subscriptions.indexOf(channel);
        if(index !== -1)
            socket.subscriptions.splice(index, 1);
    }

    subscribe(socket, channel) {
        socket.subscriptions = socket.subscriptions || [];
    
        const index = socket.subscriptions.indexOf(channel);
        if(index === -1)
            socket.subscriptions.push(channel);
    }
    
    bindNotifier(notifier, prefix) {
        notifier.emitx = notifier.emit;
        const self     = this;
        
        notifier.emit = function() {
            notifier.emitx.apply(notifier, arguments);

            if(prefix && arguments[0])
                arguments[0] = prefix + '_' + arguments[0];

            self.emit.apply(self, arguments);

            var data = [];
            for(var key in arguments) {
                var d = arguments[key];

                if(typeof(d) === 'oject' && typeof(d.toJSON) === 'function')
                    d = d.toJSON();

                data.push(d);
            }

            self.broadcast(data.shift(), data)
        };
    }
    
    broadcast(channel, data) {
        this.clients.forEach((socket) => {
            try {
                if(!socket.subscriptions || socket.subscriptions.indexOf(channel) === -1)
                    return;

                socket.write(JSON.stringify({
                    channel,
                    data
                }));
                 
            } catch(e) {
                this.onError(e);
            }
        });
    }
}

Server.Notifier = Notifier;
module.exports = Server;