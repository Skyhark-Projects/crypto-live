const zmq     = require('zmq');
const request = require('request-promise');
const event   = require('events').EventEmitter;
const bitcore = require('bitcore-lib');

const defaultSubscribe = [
    'hashtx',
    'hashblock',
    'rawblock',
    'rawtx'
];

class Notifier extends event {

    constructor(config) {
        super();

        if(config.zmq)
            this.setupZMQ(config.zmq.server, config.zmq.subscribe || defaultSubscribe);
        
        this.config = config;
    }

    setupZMQ(server, subscriptions) {
        this.socket = zmq.socket('sub');
 
        if(server.indexOf('://') === -1)
            server = 'tcp://' + server;

        this.socket.connect(server);

        for(var key in subscriptions)
            this.socket.subscribe(subscriptions[key]);
        
        this.socket.on('message', (topic, message) => {
            try {
                const name = topic.toString();

                if(this[name])
                    this[name](message);
                else
                    this.emit(name, message);
            } catch(e) {
                this.onError('zmq', e);
                console.log(message.toString('hex'))
            }
        });
    }

    rpc(cmd, arg) {
        var config = cmd;

        if(typeof(cmd) === 'string') {
            config = {
                method: cmd,
                params: arg || []
            }
        }

        if(!this.config.rpc) {
            return new Promise((resolve, reject) => {
                reject('Rpc config not found');
            });
        }

        const auth = this.config.rpc.user ? new Buffer(this.config.rpc.user + ':' + this.config.rpc.password).toString('base64') : null;

        if(this.config.rpc.server.indexOf('://') === -1)
            this.config.rpc.server = 'http://' + this.config.rpc.server;

        return request({
            uri: this.config.rpc.server,
            json: true,
            method: 'POST',
            body: config,
            headers: auth ? {
                Authorization: 'Basic ' + auth
            } : {}
        }).then((obj) => {
            if(obj.result)
                return obj.result;

            if(obj.error)
                throw(obj.error);
            
            return obj;
        }).catch((e) => {
            if(e.error)
                return e.error;
            if(e.message)
                return e.message;
            return e;
        });
    }
    
    onError() {
        console.error((new Date()).toLocaleString(), 'Error:', ...arguments);
    }

    hashtx(msg) {
        this.emit('hashtx', msg.toString('hex'));
    }

    rawtx(msg) {
        const tx = new bitcore.Transaction(msg);
        
        /*tx.getDefaultHash = tx.getHash;
        tx.getHash = function() {
            return this.getDefaultHash().toString('hex').match(/.{2}/g).reverse().join("");
        }

        tx.ins.forEach((vin) => {
            if(vin.hash)
                vin.hash = vin.hash.toString('hex').match(/.{2}/g).reverse().join("");
        });
        
        tx.toJSON = function() {
            return {
                version:  tx.version,
                locktime: tx.locktime,

                vin:      tx.ins.map((obj) => {
                    const res = {
                        sequence: obj.sequence
                    };

                    if(obj.hash) {
                        res.txid = obj.hash.toString('hex');
                        res.vout = obj.index;
                    }

                    if(obj.script)
                        res.script = obj.script.toString('hex');

                    return res;
                }),

                vout:     tx.outs.map((obj) => ({
                    value: obj.value,
                    script: obj.script.toString('hex')
                }))
            };
        }*/

        this.address(tx);
        this.emit('rawtx', tx);
    }

    hashblock(msg) {
        this.emit('hashblock', msg.toString('hex'));
    }

    rawblock(msg) {
        const block = new bitcore.Block(msg);
        this.emit('rawblock', block);
    }

    address(tx) {
        const addresses = [];

        tx.outputs.forEach((vout) => {
            try {
                var addr = vout.script.toAddress();
                
                if(!addr)
                    return;

                addr = addr.toString();
                
                if(addresses.indexOf(addr) !== -1)
                    return;
                
                addresses.push(addr);

                this.emit('address', addr, tx);
                this.emit(addr, tx);
            } catch(e) {
                this.onError('vout error', e);
            }
        });
        
        if(parseInt(process.env.parse_tx_inputs) === 0)
            return;

        tx.inputs.forEach((vin) => {
            if(!vin.prevTxId)
                return;

            this.rpc('getrawtransaction', [ vin.prevTxId.toString('hex'), 1 ]).then((tx_in) => {
                if(!tx_in.vout)
                    return this.onError('Could not load input with previous txid: ' + vin.prevTxId.toString('hex'), tx_in)
                
                const output = tx_in.vout[vin.outputIndex];
                vin.prev_output = output;
                
                if(!output)
                    return;

                if(output.scriptPubKey && output.scriptPubKey.addresses) {
                    output.scriptPubKey.addresses.forEach((addr) => {
                        if(addresses.indexOf(addr) !== -1)
                            return;
                
                        addresses.push(addr);

                        this.emit('address', addr, tx);
                        this.emit(addr, tx);
                    })
                }

            }).catch((err) => {
                this.onError(err);
            });
        });
    }
}

module.exports = Notifier;