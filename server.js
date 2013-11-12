"use strict";
var express = require('express');
var app = express();
var sockjs = require('sockjs');
var server = require('http').createServer(app);
var ch =  require('chess.js');
var echo = sockjs.createServer();

/**
 * make player object, save link to user connection in
 * @param conn
 * @constructor
 */
function Player(conn) {
  this.conn = conn;
}
/**
 * method for sending data object to user by websocket connection
 * @param data {Object} object contain "type" (start, players, move, newgame, ...),
 *                      and "data" object (optional)
 */
Player.prototype.write = function(data) {
  if (typeof data === 'object') data = JSON.stringify(data).replace(/\//g, '\\/');
  this.conn.write(data);
};

/**
 * make object for manipulating votes
 * @constructor
 */
function Votes() {
  this.votes = {};
  this.players = {};
  this.totalVoters = 0;
}
/**
 * clear votes and players, and fill votes object by possibly moves
 * @param moves {Array} array with possibly moves for current turn, array from chess.js
 */
Votes.prototype.fill = function(moves) {
  this.reset();
  for (var i = 0, l = moves.length; i<l; i++) {
    this.votes[moves[i].san] = {
      times: 0,
      xy: moves[i].from + '-' + moves[i].to
    };
  }
};
/**
 * just clear objects for next turn
 */
Votes.prototype.reset = function() {
  this.votes = {};
  this.players = {};
  this.totalVoters = 0;
};
/**
 * select moves with votes
 * @returns {Object} contain move objects like {'Qf5': {xy:'f2-f5', times: 5}}
 */
Votes.prototype.selectVoted = function() {
  var r = {};
  for (var i in this.votes) {
    if (this.votes.hasOwnProperty(i)) {
      if (this.votes[i].times > 0) r[i] = this.votes[i];
    }
  }
  return r;
};
/**
 * save vote and player id
 * or revoke old vote and save new
 * @param san {String} san of move for vote
 * @param playerId {String} voter's id
 * @returns {boolean} return false if player already voted for this move
 *                    or if move is not possible
 */
Votes.prototype.vote = function(san, playerId) {
  if (!(san in this.votes)) return false;

  if (playerId in this.players) {
    if (this.players[playerId] === san) return false;
    this.revoke(playerId);
  }

  this.players[playerId] = san;
  this.votes[san].times++;
  this.totalVoters++;
  return true;
};
/**
 * calc votes relative players for allow elections
 * if unpulled players can not change elections result - allow election
 *
 * @param totalPlayers
 *
 * @returns {boolean}
 */
Votes.prototype.checkMajority = function(totalPlayers) {
  // check if all players voted
  if (totalPlayers === this.totalVoters) return true;

  var arr = [];

  for (var san in this.votes) {
    if (this.votes.hasOwnProperty(san)) {
      if (this.votes[san].times > 0) arr.push([san, this.votes[san].times]);
    }
  }
  arr.sort(function(a, b) { return b[1] - a[1] });

  // calc lead with checking defined data (if there no votes or only one move voted)
  var lead = (arr[0] && arr[0][1] || 0) - (arr[1] && arr[1][1] || 0);

  return (lead > totalPlayers - this.totalVoters);
};
/**
 * countdown vote for move, and remove player from list of players that already voted
 * @param playerId {String}
 */
Votes.prototype.revoke = function(playerId) {
  if (this.players[playerId] && this.votes[this.players[playerId]]) {
    this.votes[this.players[playerId]].times--;
    this.totalVoters--;
    delete this.players[playerId];
  }
};
/**
 * find the most voted move and return it
 * @returns {String} san
 */
Votes.prototype.calcWinner = function() {
  var max = 0, move;
  for (var san in this.votes) {
    if (this.votes.hasOwnProperty(san)) {
      if (this.votes[san].times > max) {
        max = this.votes[san].times;
        move = san;
      }
    }
  }

  return move;
};

var game = {
  init: function() {
    this.players = {};
    this.votes = new Votes();
    this.count = { w: 0, b: 0};
    this.vTime = 20 * 1000; // max time for voting in milliseconds

    this.startNewGame();
  },

  addPlayer: function(conn) {
    var player = new Player(conn);
    player.side = this.count.w <= this.count.b ? 'w' : 'b';
    this.count[player.side]++;

    player.write({
      type: 'start',
      data: {
        env: process.env,
        fen: this.chess.fen(),
        pgn: this.chess.pgn(),
        side: player.side,
        count: this.count,
        endTurnTime: this.endTurnTime
      }
    });

    this.broadcast({
      type: 'players',
      data: this.count
    });

    this.players[conn.id] = player;
  },
  removePlayer: function(playerId) {
    this.count[this.players[playerId].side]--;

    this.votes.revoke(playerId);
    this.sendVotes();

    delete this.players[playerId];
    this.broadcast({
      type: 'players',
      data: this.count
    });
  },

  makeMove: function() {
    var move = this.votes.calcWinner(),
      time = new Date();
    this.votes.reset();
    if (!move) {
      move = this.getRandomMove();
    }
    this.chess.move(move);
    this.endTurnTime = time.setMilliseconds(time.getMilliseconds() + this.vTime);

    this.broadcast({
      type: 'move',
      data: {
        move: move,
        endTurnTime: this.endTurnTime
      }
    });

    if (this.chess.game_over()) {
      this.makeGameover();
    } else {
      this.electionTimeout = setTimeout(this.makeMoveBinded, this.vTime);
    }
    this.votes.fill(game.chess.moves({ verbose: true }));
  },
  getRandomMove: function() {
    var possibleMoves = game.chess.moves({ verbose: true });
    var randomIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[randomIndex].san;
  },
  makeGameover: function() {
    var self = this;

    setTimeout(function(){
      self.startNewGame();
    }, 30000);
  },
  startNewGame: function() {
    var time = new Date();
    this.chess = new ch.Chess();
    this.votes.fill(game.chess.moves({ verbose: true }));
    this.electionTimeout = setTimeout(this.makeMoveBinded, this.vTime);
    this.endTurnTime = time.setMilliseconds(time.getMilliseconds() + this.vTime);
    this.broadcast({
      type: 'newgame',
      data: {
        endTurnTime: this.endTurnTime
      }
    });
  },

  broadcast: function(data) {
    for (var playerId in this.players) {
      if(this.players.hasOwnProperty(playerId)) {
        this.players[playerId].write(data);
      }
    }
  },
  ondata: function(playerId, data) {
    data = JSON.parse(data);
    if (data.type === 'say') {
      this.say(data.data, this.players[playerId].side);
    }
    if (data.type === 'vote') {
      this.vote(data.data, playerId);
    }
    if (data.type === 'switchside') {
      this.switchPlayerSide(playerId);
    }

  },
  say: function(data, side) {
    this.broadcast({
      type: 'say',
      data: {
        side: side,
        msg: data.slice(0, 140)
      }
    });
  },
  vote: function(vote, playerId) {
    if (!this.votes.vote(vote, playerId)) return;

    if (this.votes.checkMajority(this.count[this.chess.turn()])) {
      clearTimeout(this.electionTimeout);
      this.makeMove();
    } else {
      this.sendVotes();
    }
  },
  sendVotes: function(fire) {

    if (fire) {
      this.broadcast({
        type: 'votes',
        data: {
          votes: this.votes.selectVoted(),
          totalVoters: this.count[this.chess.turn()]
        }
      });
    } else {
      setTimeout(this.sendVotes.bind(this, true), 100);
    }

  },
  switchPlayerSide: function(playerId) {
    var player = this.players[playerId],
      other = player.side=='w' ? 'b' : 'w';
    if (this.count[player.side] === 1) return;

    this.count[player.side]--;
    this.count[other]++;
    player.side = other;

    this.votes.revoke(playerId);
    this.sendVotes();

    player.write({
      type: 'switchside'
    });
    this.broadcast({
      type:'players',
      data: this.count
    });
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

app.use(express.compress());
app.use(express.static('static-build', {maxAge: 1000 * 60 * 60 * 24}));


server.listen(process.env.PORT || 3000);