'use strict'
const resolve = require('path').resolve
const exec = require('child_process').exec
const config = require('./config.json')


class Room {
    constructor(id, name, type, visible = true, tournament = null) {
        this.id = id
        this.name = name
        this.players = []
        this.type = type
        this.visible = visible
        this.tournament = tournament
        this.next = null
        this.fakeBackend = null
    }

    addPlayer(player) {
        this.players.push(player)
        this.sendPlayerCount()

        if (this.players.length == 2)
            this.startGame()
    }

    removePlayer(player) {
        let index = this.players.indexOf(player)
        if (index !== -1) this.players.splice(index, 1)
        this.sendPlayerCount()
    }

    getPlayers() {
        if (this.type == 'normal') return this.players
        return this.tournament.getPlayers()
    }

    get maxPlayer() {
        if (this.type == 'normal') return 2
        return this.tournament.max
    }

    sendPlayerCount() {
        let players = this.getPlayers()
        players.forEach(player => {
            player.socket.emit('playerCount', {
                count: players.length
            })
        })
    }

    startGame() {
        // create FB0
        Room.fakeBackendQueue.push(this)
		console.log("try to create FB")
        exec(resolve(`./${config['FBPath']}`))

        // this.initOver()
    }

    initOver() {
        this.players.forEach(player => {
            player.socket.emit('initOver')
        })
    }
}

Room.fakeBackendQueue = []

module.exports = Room