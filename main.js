'use strict';
const io = require('socket.io')({
    transports: ['websocket'],
});
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const assert = require('assert');
const port = config['port']
const Player = require('./player.js')
const Tournament = require('./tournament.js')
const Room = require('./room.js')
const roomDict = {};
const playerDict = {}

config['rooms'].forEach(room => {
    roomDict[room.id] = new Room(room.id, room.name, "normal")
})

const tournament = new Tournament(config['tournament'])
tournament.rooms.forEach(room => roomDict[room.id] = room)

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

io.listen(port);

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    playerDict[socket.id] = new Player(socket)

    socket.on('disconnect', warp(() => {
        playerDict[socket.id].exitRoom()
        console.log(`${socket.id} disconnected`)
        delete playerDict[socket.id]
    }))

    socket.on('getServerName', warp(data => {
        socket.emit("getServerName", { name: config['serverName'] });
    }))

    socket.on('listRoom', warp(data => {
        socket.emit("listRoom", {
            rooms: Object.values(roomDict).filter(room => room.visible).map(room => {
                return {
                    id: room.id,
                    name: room.name,
                    playerCount: room.players.length,
                    type: room.type
                }
            })
        });
    }))

    socket.on('joinRoom', warp(data => {
        let id = data.roomID;
        assert.equal(typeof id, 'string')

        if (!(id in roomDict)) {
            socket.emit("joinRoom", {
                "success": false,
                "msg": 'id not exsist',
                "roomName": '',
                "maxPlayer": 0
            });
            return
        }

        let room = roomDict[id]
        let msg = playerDict[socket.id].joinRoom(room);

        socket.emit("joinRoom", {
            "success": msg == 'ok',
            "msg": msg,
            "roomName": room.name,
            "maxPlayer": room.maxPlayer()
        });
    }))

    socket.on('exitRoom', warp(data => {
        socket.emit("exitRoom", {
            "success": playerDict[socket.id].exitRoom(),
        });
    }))

    // for testing player operations
    socket.on('operation', warp(data => {
        io.emit("operation", data);
    }))
})

console.log('開始，網址為： localhost:' + port)