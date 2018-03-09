const Client = require('../src');

const c = new Client(/*{
    server: 'https://live.bit4you.io/'
}*/);

c.on('btc_hashtx', (hash) => {
    console.log('received', hash)
});

c.on('address', (addr, txid) => {
    console.log('address', addr, txid)
});