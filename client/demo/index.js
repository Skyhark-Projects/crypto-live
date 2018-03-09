const Client = require('../src');

const c = new Client({
    server: 'https://rpc.bit4you.io/live'
});

c.on('btc_hashtx', (hash) => {
    console.log('received', hash)
});

c.on('address', (addr, txid) => {
    console.log('address', addr, txid)
});