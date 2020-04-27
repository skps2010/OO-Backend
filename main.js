var io = require('socket.io')({
    transports: ['websocket'],
});
var util = require('util')

io.listen(4567);

io.on('connection', socket => {
    console.log('connected')

    socket.on('disconnect', () => { console.log('disconnected') })
})