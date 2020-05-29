class Room {
    constructor(id, name, type, visible = true, tournament = null) {
        this.id = id;
        this.name = name;
        this.players = [];
        this.type = type;
        this.visible = visible;
        this.tournament = tournament;
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
        return this.tournament.getPlayers()
    }

    maxPlayer() {
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
}

module.exports = Room