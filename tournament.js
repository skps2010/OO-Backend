'use strict'
const Room = require('./room.js')

class Tournament {
    constructor(count) { // count為參加人數
        let rounds = count - 1
        this.rooms = new Array(rounds + 1)
        this.max = count
        let prefix = 't'

        for (let i = rounds; i >= 1; i--) {
            let id = prefix + i
            let room = new Room(id, "tournament room #" + i, "tournament", i * 2 >= count, this)
            this.rooms[i] = room

            if (i * 2 < count) {
                this.rooms[i * 2].next = room
                this.rooms[i * 2 + 1].next = room
            }
        }
    }

    getPlayers() {
        let players = []
        this.rooms.forEach(room => players = players.concat(room.players))
        return players
    }
}

module.exports = Tournament