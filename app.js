"use strict";
var express = require('express');
var app = express();
var sockjs = require('sockjs');
var server = require('http').createServer(app);
var ch =  require('chess.js');
var echo = sockjs.createServer();

function Player(conn) {
  this.conn = conn;
}
Player.prototype.write = function(data) {
  if (typeof data === 'object') data = JSON.stringify(data).replace(/\//g, '\\/');
  this.conn.write(data);
};

var game = {
  addPlayer: function(conn) {
    var player = new Player(conn);
    player.side = this.count.w <= this.count.b ? 'w' : 'b';
    this.count[player.side]++;

    player.write({
      type: 'start',
      data: {
        fen: this.chess.fen(),
        pgn: this.chess.pgn(),
        side: player.side,
        count: this.count,
        progress: ~~(100 - (+(new Date()) - +this.electionStartTime) / this.vTime *100)
      }
    });

    this.broadcast({
      type: 'players',
      data: this.count
    });

    this.players[conn.id] = player;
  },
  removePlayer: function(id) {
    this.count[this.players[id].side]--;
    delete this.players[id];
    this.broadcast({
      type: 'players',
      data: this.count
    });
  },
  init: function() {
    this.players = {};
    this.count = { w: 0, b: 0};
    this.vTime = 20 * 1000; // max time for voting in milliseconds

    this.startNewGame();
  },

  broadcast: function(data) {
    for (var key in this.players) {
      if(this.players.hasOwnProperty(key)) {
        this.players[key].write(data);
      }
    }
  },
  makeMove: function() {
    var move = this.getVoteWinner();
    this.votes = {};
    if (!move) {
      move = this.getRandomMove().san;
    }
    this.chess.move(move);

    this.broadcast({
      type: 'move',
      data: move
    });

    if (this.chess.game_over()) {
      this.makeGameover();
    } else {
      this.electionTimeout = setTimeout(this.makeMoveBinded, this.vTime);
      this.electionStartTime = new Date();
      this.renewVotes();
    }
  },
  renewVotes: function() {
    this.votes = {};
    var possibleMoves = game.chess.moves({ verbose: true });
    for (var i = 0, l = possibleMoves.length; i<l; i++) {
      this.votes[possibleMoves[i].san] = {
        xy: possibleMoves[i].from + '-' + possibleMoves[i].to,
        times: 0
      }
    }
  },
  getVoteWinner: function() {
    var max = 0, move;
    for (var key in this.votes) {
      if (this.votes.hasOwnProperty(key)) {
        if (this.votes[key].times > max) {
          max = this.votes[key].times;
          move = key;
        }
      }
    }
    return move;
  },
  getRandomMove: function() {
    var possibleMoves = game.chess.moves({ verbose: true });
    var randomIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[randomIndex];
  },
  makeGameover: function() {
    var self = this;

    setTimeout(function(){
      self.startNewGame();
    }, 30000);
  },
  startNewGame: function() {
    var now = new Date();
    this.chess = new ch.Chess();
    this.votes = {};
    this.electionTimeout = setTimeout(this.makeMoveBinded, this.vTime);
    this.electionStartTime = new Date();
    this.broadcast({
      type: 'newgame'
    });
  },
  say: function(data, side) {
    this.broadcast({
      type: 'say',
      data: {
        side: side,
        msg: data
      }
    });
  },
  vote: function(vote, player) {
    // TODO save this vote and delete from list when connection lost
    if (!(vote in this.votes)) {
      return;
    }
    this.votes[vote].times++;
    // TODO make proxy
    this.broadcast({
      type: 'votes',
      data: this.votes
    });
    // TODO check if all players voted then makeMove, clear timeout
  },
  switchPlayerSide: function(id) {
    var player = this.players[id];
    if (this.count[player.side] === 1) return;
    var other = player.side=='w' ? 'b' : 'w';
    this.count[player.side]--;
    this.count[other]++;
    player.side = other;
    player.write({
      type: 'switchside'
    });
    this.broadcast({
      type:'players',
      data: this.count
    });
  },
  ondata: function(id, data) {
    data = JSON.parse(data);
    console.log(data.type, data.data)
    if (data.type === 'say') {
      this.say(data.data, this.players[id].side);
    }
    if (data.type === 'vote') {
      this.vote(data.data, this.players[id]);
    }
    if (data.type === 'switchside') {
      this.switchPlayerSide(id);
    }

  }
};
game.makeMoveBinded = game.makeMove.bind(game);

game.init();

echo.on('connection', function(conn) {
  game.addPlayer(conn);
  conn.on('data', function(data){
    game.ondata(conn.id, data);
  });
  conn.on('close', function() {
    game.removePlayer(conn.id);
  });
});

echo.installHandlers(server, {prefix:'/game'});

app.use(express.static('static'));

app.get('/', function(req, res){
  res.send('Hello World');
});

server.listen(3000);