#!/usr/bin/env node

const Server = require('../src/server.js');
const fs     = require('fs');
const path   = require('path');

var config = null;

if(process.argv[2] || process.env.zmq_server) {
    configPath = path.resolve(process.cwd(), process.argv[2] || process.env.zmq_server);
    config     = fs.readFileSync(configPath);
    config     = JSON.parse(config);
} else {
    console.error('Please specify a config path in your environment or as an argument');
    console.error('Example: export zmq_server="./config.json"');
    console.error('or: crypto-live-server ./config.json');
    process.exit(1);
}

const c = new Server(config);

//c.on('btc_hashtx', (hash) => {
//    console.log('tx received', hash)
//})
//
//c.on('btc_hashblock', (hash) => {
//    ...
//})
//
//c.on('btc_rawtx', (hash) => {
//    ...
//})
//
//c.on('btc_rawblock', (hash) => {
//    ...
//})
//
//c.on('btc_address', (hash) => {
//    ...
//})
//
//c.on('btc_3CYX8iWuJPaXQJnr4Pv8qMZm4aM7YEx3Yk', (hash) => {
//    ...
//})