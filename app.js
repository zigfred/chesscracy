var express = require('express');
var app = express();
var sockjs = require('sockjs');
var server = require('http').createServer(app);
var ch =  require('chess.js');
var echo = sockjs.createServer();

function Game() {
	this.players = {};
	this.count = {w:0,b:0};
	this.chess = new ch.Chess();
	this.moves = {};
	this.moveTimeCounter = new function(){
		this.timer = this.timeout = 20;
		this.reset = function() {
			this.timer = this.timeout;
		};
		this.down = function() {
			this.timer = 0;
		};
		this.toString = function() {
			return this.timer--;
		};
		this.progress = function() {
			return (this.timer*100/this.timeout);
		};
	}; // times to loop 1s to end move
}
Game.prototype.addPlayer = function(conn) {
	var side = this.count.w <= this.count.b ? 'w' : 'b';

	this.players[conn.id] = new Player(conn);
	this.players[conn.id].game = this;
	this.players[conn.id]._side = side;
	this.count[side]++;

	return side;
};
Game.prototype._broadcast = function(data) {
	// TODO use eachPlayers
	for(var key in this.players) {
		if(this.players.hasOwnProperty(key)) {
			this.players[key]._write(data);
		}
	}
};
Game.prototype.eachPlayers = function(func) {
	for(var key in this.players) {
		if(this.players.hasOwnProperty(key)) {
			//return func.call(this, this.players[key]);
			return func(this.players[key]);
		}
	}
}
Game.prototype._sendStatus = function() {
	var self = this;
	this._statusInterval = setInterval(function(){
		self._broadcast({
			type: 'status',
			data: {
				turn: self.chess.turn(),
				players: self.count,
				moves: self.moves,
				progress_move: self.moveTimeCounter.progress()
			}
		});
	}, 500);
};
Game.prototype.moveEndLoop = function() {
	var self = this;
	setTimeout(function(){
		if (self.moveTimeCounter>0) {
			self.checkOpponents();
			self.moveEndLoop();
		} else {
			self.moveTimeCounter.reset();
			self._makeMove();
		}
	}, 1000);
};
Game.prototype._makeMove = function() {
	var max = 0, move = '';
	for (var key in this.moves) {
		if (this.moves.hasOwnProperty(key)) {
			if (this.moves[key]>max) {
				max = this.moves[key];
				move = key;
			}
		}
	}
	if (!max) {
		var possibleMoves = game.chess.moves({ verbose: true });
		// game over
		//if (possibleMoves.length === 0) return;

		var randomIndex = Math.floor(Math.random() * possibleMoves.length);
		move = possibleMoves[randomIndex];
	} else {
		move = JSON.parse(move);
	}

	this.chess.move(move);
	this._broadcast(JSON.stringify({
		type: 'move',
		data: move
	}));
	console.log(JSON.stringify(move))
	this.moves = {};

	if (this.chess.game_over()) {
		var self = this;
		setTimeout(function(){
			self.game_over();
		}, 20000);
	} else {
		this.moveEndLoop();
	}
};
Game.prototype.checkOpponents = function() {
	var turn = this.chess.turn(),
		other = turn=='w' ? 'b' : 'w',
		counter = 1;

	if (this.count[turn]<1 && this.count[other]>1 ) {
		this.eachPlayers(function(player){
			if (counter++ % 2) {
				player.switchSide();
			}
		});

		this.moveTimeCounter.reset();
	}
};
Game.prototype.game_over = function() {
	this.chess = new ch.Chess();
	this.moveTimeCounter.reset();
	this._broadcast(JSON.stringify({
		type: 'newgame',
		data: {}
	}));

	this.moveEndLoop();
};

function Player(conn) {
	this.conn = conn;
}
Player.prototype.ondata = function(msg) {
	msg = JSON.parse(msg);
	this['_'+msg.type](msg.data);
};
Player.prototype._move = function(move) {
	var moveStr = JSON.stringify(move)
	if (!(moveStr in this.game.moves)) this.game.moves[moveStr] = 0;
	if (++this.game.moves[moveStr]>=this.game.count[this.game.chess.turn()]) this.game.moveTimeCounter.down();
};
Player.prototype._switchside = function() {
	if (this.game.count[this._side]<2) return;
	this.switchSide('you');
};
Player.prototype._userMsg = function(msg) {
	this.game._broadcast(JSON.stringify({
		type: 'userMsg',
		data: msg
	}));
};
Player.prototype._write = function(data) {
	if (typeof data === 'object') data = JSON.stringify(data).replace(/\//g, '\\/');
	this.conn.write(data);
};
Player.prototype.init = function() {
	this._write({
		type: 'init',
		data: {
			fen: this.game.chess.fen(),
			side: this._side,
			w: this.game.count.w,
			b: this.game.count.b
		}
	})
};

Player.prototype.switchSide = function(reason) {
	var other = this._side=='w' ? 'b' : 'w';
	this.game.count[this._side]--;
	this.game.count[other]++;
	this._side = other;
	this._write({
		type: 'switchside',
		data: {
			reason: reason || 'no players on one side',
			side: other=='w' ? 'white' : 'black'
		}
	});
};


var game = new Game();
game._sendStatus();
game.moveEndLoop();

echo.on('connection', function(conn) {
	game.addPlayer(conn);
	game.players[conn.id].init();
	conn.on('data', function(data){
		game.players[conn.id].ondata(data);
	});
	conn.on('close', function() {
		console.log(game.players[conn.id]._side);
		game.count[game.players[conn.id]._side]--;
		delete game.players[conn.id];
	});
});

echo.installHandlers(server, {prefix:'/game'});

app.use(express.static('static'));

app.get('/', function(req, res){
	res.send('Hello World');
});

server.listen(3000);
