'use strict';
const io = require('socket.io')({
    transports: ['websocket'],
});
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const assert = require('assert');
const port = config['port']
const roomDict = {};
const playerDict = {}

class Tournament {
    constructor(count) { // count為參加人數
        let rounds = count * 2 - 1
        this.rooms = new Array(rounds + 1);
        let prefix = 't'

        for (let i = rounds; i >= 1; i--) {
            let id = prefix + i
            let room = new Room(id, "tournament room #" + i, "tournament", i >= count)
            this.rooms[i] = room
            roomDict[id] = room

            if (i < count) {
                this.rooms[i * 2].next = room
                this.rooms[i * 2 + 1].next = room
            }
        }
    }

    getPlayers() {
        let players = [];
        this.rooms.forEach(room => players = players.concat(room.players))
        return players
    }
}

class Room {
    constructor(id, name, type, visible = true) {
        this.id = id;
        this.name = name;
        this.players = [];
        this.type = type;
        this.visible = visible;
        this.next = null;
    }

    addPlayer(player) {
        this.players.push(player);
        this.sendPlayerCount()
    }

    removePlayer(player) {
        let index = this.players.indexOf(player);
        if (index !== -1) this.players.splice(index, 1);
        this.sendPlayerCount()
    }

    getPlayers() {
        if (this.type == 'normal') return this.players
        return tournament.getPlayers()
    }

    maxPlayer() {
        if (this.type == 'normal') return 2
        return config['tournament']
    }

    sendPlayerCount() {
        let players = this.getPlayers()
        players.forEach(player => {
            player.socket.emit('playerCount', {
                count: players.length
            })
        })
    }
}

config['rooms'].forEach(room => {
    roomDict[room.id] = new Room(room.id, room.name, "normal")
})
var tournament = new Tournament(config['tournament'])

class Player {
    constructor(socket) {
        this.socket = socket
        this.id = socket.id;
        this.state = 'lobby'
        this.room = null
    }

    joinRoom(room) {
        if (this.room != null) return "you are in a room already"
        if (room.players.length >= 2) return "full"

        room.addPlayer(this)
        this.room = room

        return "ok"
    }

    exitRoom() {
        if (this.room == null) return false;
        this.room.removePlayer(this)

        this.room = null
        return true
    }
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