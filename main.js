'use strict';
var io = require('socket.io')({
    transports: ['websocket'],
});
var AsyncLock = require('async-lock');
var lock = new AsyncLock();
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
var room_dict = {};
var player_dict = {}

config['rooms'].forEach(room => {
    room_dict[room.id] = {
        id: room.id,
        name: room.name,
        players: [],
        type: "normal"
    }
})

class Player {
    constructor(socket) {
        this.socket = socket
        this.id = socket.id;
        this.state = 'lobby'
        this.room = null
    }
}

function sendPlayerCount(id) {
    room_dict[id].players.forEach(pid => {
        player_dict[pid].socket.emit('playerCount', {
            count: room_dict[id].players.length
        })
    })
}

function warp(func) {
    function warpped(...args) {
        try {
            func(...args)
        } catch (e) {
            console.log(e)
        }
    }

    return warpped
}

io.listen(4567);

io.on('connection', socket => {
    console.log('connected')
    player_dict[socket.id] = new Player(socket)

    socket.on('disconnect', warp(() => {
        console.log('disconnected')
        delete player_dict[socket.id]
    }))

    socket.on('getServerName', warp(data => {
        console.log('send name');
        socket.emit("getServerName", { name: config['serverName'] });
    }))

    socket.on('listRoom', warp(data => {
        console.log('send rooms');
        socket.emit("listRoom", { rooms: Object.values(room_dict) });
    }))

    socket.on('joinRoom', warp(data => {
        let id = data.roomID;
        let msg;
        let success = false;

        if (player_dict[socket.id].room != null) msg = 'you are in a room already';
        else if (!(id in room_dict)) msg = 'id not exsist'
        else if (room_dict[id].players.length >= 2) msg = 'full'
        else {
            msg = 'ok'
            success = true;

            room_dict[id].players.push(socket.id);
            player_dict[socket.id].room = id
        }
        socket.emit("joinRoom", {
            "sueccess": success,
            "msg": msg
        });
        sendPlayerCount(id)
    }))

    socket.on('exitRoom', warp(data => {
        let success = false;
        let id = player_dict[socket.id].room

        if (player_dict[socket.id].room != null) {
            success = true;

            let players = room_dict[id].players
            let index = players.indexOf(socket.id);
            if (index !== -1) players.splice(index, 1);
            player_dict[socket.id].room = null
        }
        socket.emit("exitRoom", {
            "sueccess": success,
        });
        sendPlayerCount(id)
    }))
})

console.log('開始')