'use strict'
const io = require('socket.io')({
    transports: ['websocket'],
})
const fs = require('fs')
const config = JSON.parse(fs.readFileSync('config.json'))
const assert = require('assert')
const port = config['port']
const Player = require('./player.js')
const FakeBackend = require('./fakeBackend.js')
const Tournament = require('./tournament.js')
const Room = require('./room.js')
const roomDict = {}
const playerDict = {}
const fakeBackendDict = {}
const spawn = require('child_process').spawn;
const token = '14508888'


config['rooms'].forEach(room => {
    roomDict[room.id] = new Room(room.id, room.name, "normal")
})

const tournament = new Tournament(config['tournament'])
tournament.rooms.forEach(room => roomDict[room.id] = room)

var fakeBackendQueue = [];
Object.values(roomDict).forEach(room => {
    spawn('ls', ['-lh', '/usr'])
    fakeBackendQueue.push(room)
})

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

io.listen(port)

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    playerDict[socket.id] = new Player(socket)

    socket.on('disconnect', warp(() => {
        console.log(`${socket.id} disconnected`)

        if (socket.id in playerDict) {
            playerDict[socket.id].exitRoom()
            delete playerDict[socket.id]
        } else delete fakeBackendDict[socket.id]
    }))

    socket.on('getServerName', warp(data => {
        socket.emit("getServerName", { name: config['serverName'] })
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
        })
    }))

    socket.on('joinRoom', warp(data => {
        let id = data.roomID
        assert.equal(typeof id, 'string')

        if (!(id in roomDict)) {
            socket.emit("joinRoom", {
                "success": false,
                "msg": 'id not exsist',
                "roomName": '',
                "maxPlayer": 0
            })
            return
        }

        let room = roomDict[id]
        let msg = playerDict[socket.id].joinRoom(room)

        socket.emit("joinRoom", {
            "success": msg == 'ok',
            "msg": msg,
            "roomName": room.name,
            "maxPlayer": room.maxPlayer()
        })
    }))

    socket.on('exitRoom', warp(data => {
        socket.emit("exitRoom", {
            "success": playerDict[socket.id].exitRoom(),
        })
    }))

    socket.on('serverCreated', warp(data => {
        console.log("token:" + token + data.token)
        if (data.token != token) {
            socket.emit("serverCreated", {
                "success": false,
            })

            return
        }

        console.log(`${socket.id} is now a fake backend`)
        delete playerDict[socket.id]

        let room = fakeBackendQueue.pop()
        fakeBackendDict[socket.id] = new FakeBackend(socket, room)
        room.fakeBackend = fakeBackendDict[socket.id]

        socket.emit("serverCreated", {
            "success": true,
        })

    }))

    // for testing player operations
    socket.on('operation', warp(data => {
        io.emit("operation", data)
    }))
})

console.log('開始，網址為： localhost:' + port)