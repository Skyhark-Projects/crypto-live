const Client = require('../src');

const c = new Client({
    server: 'http://0.0.0.0:9999/'
});

c.on('btc_hashtx', (hash) => {
    console.log('received', hash)
});