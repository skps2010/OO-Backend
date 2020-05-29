'use strict'
class FakeBackend {
    constructor(socket, room) {
        this.socket = socket
        this.id = socket.id
        this.room = room

        this.socket.on('setPlayerID', warp(data => {
            let ids = data.ids
            let i = 0

            this.room.players.forEach(player => {
                player.FBid = ids[i]
                i++
            })

        }))
    }
}

module.exports = FakeBackend