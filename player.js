'use strict'
class Player {
    constructor(socket) {
        this.socket = socket
        this.id = socket.id
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
        if (this.room == null) return false
        this.room.removePlayer(this)

        this.room = null
        return true
    }
}

module.exports = Player