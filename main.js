'use strict';
const io = require('socket.io')({
    transports: ['websocket'],
});
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const assert = require('assert');
const port = config['port']
var roomDict = {};
var playerDict = {}

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

    getPlayers() {
        if (this.type == 'normal') return this.players
        return tournament.getPlayers()
    }

    maxPlayer() {
        if (this.type == 'normal') return 2
        return config['tournament']
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
}

function sendPlayerCount(id) {
    let players = roomDict[id].getPlayers()
    players.forEach(pid => {
        playerDict[pid].socket.emit('playerCount', {
            count: players.length
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

io.listen(port);

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    playerDict[socket.id] = new Player(socket)

    socket.on('disconnect', warp(() => {
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
        let msg;
        let success = false;

        if (playerDict[socket.id].room != null) msg = 'you are in a room already';
        else if (!(id in roomDict)) msg = 'id not exsist'
        else if (roomDict[id].players.length >= 2) msg = 'full'
        else {
            msg = 'ok'
            success = true;

            roomDict[id].players.push(socket.id);
            playerDict[socket.id].room = id
            sendPlayerCount(id)
        }
        socket.emit("joinRoom", {
            "success": success,
            "msg": msg,
            "roomName": roomDict[id].name,
            "maxPlayer": roomDict[id].maxPlayer()
        });
    }))

    socket.on('exitRoom', warp(data => {
        let success = false;
        let id = playerDict[socket.id].room

        if (playerDict[socket.id].room != null) {
            success = true;

            let players = roomDict[id].players
            let index = players.indexOf(socket.id);
            if (index !== -1) players.splice(index, 1);
            playerDict[socket.id].room = null
            sendPlayerCount(id)
        }
        socket.emit("exitRoom", {
            "success": success,
        });
    }))
})

console.log('開始，網址為： localhost:' + port)