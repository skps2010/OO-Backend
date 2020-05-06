var io = require('socket.io')({
    transports: ['websocket'],
});
var util = require('util')
const fs = require('fs');

let rawdata = fs.readFileSync('config.json');
var config = JSON.parse(rawdata);

io.listen(4567);

io.on('connection', socket => {
    console.log('connected')

    socket.on('disconnect', () => { console.log('disconnected') })

    socket.on('getServerName', () => {
        console.log('send name');
        socket.emit("getServerName", config["serverName"]);
    })
})

console.log('開始')