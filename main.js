'use strict'

const fs = require('fs')
const assert = require('assert')
const Player = require('./player.js')
const FakeBackend = require('./fakeBackend.js')
const Tournament = require('./tournament.js')
const Room = require('./room.js')

const roomDict = {}
const playerDict = {}
const fakeBackendDict = {}

const config = JSON.parse(fs.readFileSync('config.json'))
const port = config['port']
const token = config['FBToken']

config['rooms'].forEach(room => {
    roomDict[room.id] = new Room(room.id, room.name, 'normal')
})

const tournament = new Tournament(config['tournament'])
tournament.rooms.forEach(room => roomDict[room.id] = room)

function wrap(func) {
    function wrapped(...args) {
        try {
            args = args.map(arg => typeof arg == 'string' ? JSON.parse(arg) : arg)
            func(...args)
        } catch (e) {
            console.log(e)
            console.log('args:', args)
        }
    }

    return wrapped
}

const io = require('socket.io')({
    transports: ['websocket'],
})

io.listen(port)

io.on('connection', socket => {
    console.log(`${socket.id} connected`)
    playerDict[socket.id] = new Player(socket)

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`)

        if (socket.id in playerDict) {
            playerDict[socket.id].exitRoom()
            delete playerDict[socket.id]
        } else {
            delete fakeBackendDict[socket.id]
        }
    })

    socket.on('getServerName', wrap(data => {
        socket.emit('getServerName', { name: config['serverName'] })
    }))

    socket.on('listRoom', wrap(data => {
        socket.emit('listRoom', {
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

    socket.on('joinRoom', wrap(data => {
        let id = data.roomID
        assert.equal(typeof id, 'string')

        if (!(id in roomDict)) {
            socket.emit('joinRoom', {
                'success': false,
                'msg': 'id not exsist',
                'roomName': '',
                'maxPlayer': 0
            })
            return
        }

        let room = roomDict[id]
        let msg = playerDict[socket.id].joinRoom(room)

        socket.emit('joinRoom', {
            'success': msg === 'ok',
            'msg': msg,
            'roomName': room.name,
            'maxPlayer': room.maxPlayer
        })
    }))

    socket.on('exitRoom', wrap(data => {
        socket.emit('exitRoom', {
            'success': playerDict[socket.id].exitRoom(),
        })
    }))

    socket.on('addRoom', wrap(data => {
        const rommID = data.roomID
        const success = roomID in roomDict && data.token === token
        if (success) {
            roomDict[roomID] = new Room(roomID, data.name, 'normal')
        }
        socket.emit('addRoom', {
            'success': success
        })
    }))

    socket.on('closeRoom', wrap(data => {
        const roomID = data.roomID
        const success = data.token === token && roomID in roomDict && roomDict[roomID].players.length == 0
        if (success) {
            delete roomDict[roomID]
        }
        socket.emit('closeRoom', {
            'success': success
        })
    }))

    socket.on('removePlayer', wrap(data => {
        const success = data.token === token && data.playerID in playerDict
        if (success) {
            playerDict[data.playerID].socket.disconnect()
        }
        socket.emit('removePlayer', {
            'success': success
        })
    }))

    socket.on('operation', wrap(data => {
        const player = playerDict[socket.id]
        const room = player.room
        const fb = room.fakeBackend
        data['uuid'] = player.FBid
        fb.socket.emit('operation', data)
    }))

    socket.on('ready', wrap(data => {
        const player = playerDict[socket.id]
        const room = player.room
        const fb = room.fakeBackend
            ++fb.readier
        if (fb.readier == 2) {
            fb.socket.emit('ready')
        }

        console.log('ready!!!!!!', fb.readier)
    }))

    socket.on('serverCreated', wrap(data => {
        console.log(`token: ${token} ${data.token}`)
        if (data.token != token) {
            socket.emit('serverCreated', {
                'success': false,
            })

            return
        }

        console.log(`${socket.id} is now a fake backend`)
        delete playerDict[socket.id]

        let room = Room.fakeBackendQueue.pop()
        fakeBackendDict[socket.id] = new FakeBackend(socket, room)
        room.fakeBackend = fakeBackendDict[socket.id]

        room.players.forEach(player => {
            player.socket.emit('startGame')
        })

        socket.on('setPlayerID', wrap(data => {
            console.log(data)
            console.log(JSON.stringify(data))
            let ids = data.ids
            let i = 0

            room.players.forEach(player => {
                player.FBid = ids[i]
                    ++i
            })
        }))

        socket.on('initOver', wrap(data => {
            room.initOver()
        }))

        socket.on('updateEntity', wrap(data => {
            room.boardcast('updateEntity', data)
        }))

        socket.on('invokeEvent', wrap(data => {
            room.boardcast('invokeEvent', data)
        }))

        socket.emit('serverCreated', {
            'success': true,
        })
    }))
})

console.log('開始，網址為： localhost:' + port)