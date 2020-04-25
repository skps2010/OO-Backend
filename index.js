const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

io.on('connection', (socket) => {
    console.log('connected');

    // 當發生離線事件
    socket.on('disconnect', () => {
        console.log('disconnect');
    });
});

server.listen(80, () => {
    console.log("Server Started. http://localhost:80");
});