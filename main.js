'use strict'

const fs = require('fs')
const assert = require('assert')
const Player = require('./player.js')
const FakeBackend = require('./fakeBackend.js')
const Tournament = require('./tournament.js')
const Room = require('./room.js')
    // const spawn = require('child_process').spawn

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

// Object.values(roomDict).forEach(room => {
//     //spawn('ls', ['-lh', '/usr'])
//     Room.fakeBackendQueue.push(room)
// })

function wrap(func) {
    function wrapped(...args) {
        try {
            args = args.map(arg => typeof arg == 'string' ? JSON.parse(arg) : arg);
            func(...args)
        } catch (e) {
            console.log(e)
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

    socket.on('disconnect', wrap(() => {
        console.log(`${socket.id} disconnected`)

        if (socket.id in playerDict) {
            playerDict[socket.id].exitRoom()
            delete playerDict[socket.id]
        } else {
            delete fakeBackendDict[socket.id]
        }
    }))

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

    socket.on('operation', wrap(data => {
        const player = playerDict[socket.id]
        const room = player.room
        const fb = room.fakeBackend
        data['uuid'] = player.FBid
        fb.socket.emit('operation', data);
    }))

    socket.on('ready', wrap(data => {
        const player = playerDict[socket.id]
        const room = player.room
        const fb = room.fakeBackend
            ++fb.i
        if (fb.i == 2) {
            fb.socket.emit('ready')
        }
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

            // let room = fakeBackendDict[socket.id].room
            room.players.forEach(player => {
                player.FBid = ids[i]
                    ++i
            })
        }))

        socket.on('initOver', wrap(data => {
            // let room = fakeBackendDict[socket.id].room
            room.initOver()
        }))

        socket.on('updateEntity', wrap(data => {
            room.players.forEach(player => {
                player.socket.emit('updateEntity', data)
            })
        }))

        socket.emit('serverCreated', {
            'success': true,
        })

    }))

    // for testing player operations
    socket.on('operation', wrap(data => {
        io.emit('operation', data)
    }))
})

console.log('開始，網址為： localhost:' + port)