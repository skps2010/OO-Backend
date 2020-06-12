'use strict'
class FakeBackend {
    constructor(socket, room) {
        this.socket = socket
        this.id = socket.id
        this.room = room
        this.i = 0
    }
}

module.exports = FakeBackend