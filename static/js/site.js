$(window).load(function () {
	window.game = new Game(620);

	$(document).keydown(function() {
		$('#inputMsg').focus();
	});
});

function Game(size) {
	this.size = size;
	this.sizeSquare = (size/8);
	this.sizeSquareHalf = (size/8/2);
	this.sizeShift = (2 * size/8/5 + size/8/5/5);
	this.sizeShiftText = (2 * size/8/6);

	this.elms = {
		board: $('#board'),
		votes: $('#votes'),
		switch_side: $('#switch_side'),
		broadcast: $('#broadcast'),
		log: $('#log'),
		game_status: $('#game_status'),
		progress_move_w: $('#progress_move_w'),
		progress_move_b: $('#progress_move_b'),
		white_count: $('#white_count'),
		black_count: $('#black_count'),
		you_orientation: $('#you_orientation'),
		your_move: $('#your_move'),
		inputMsg: $('#inputMsg'),
		sendMsg: $('#sendMsg')

	};
	this.stat = {
		players: {w:0,b:0}
	};
	this.myMoves = [];

	this.lastMove = '';

	this.sock = new SockJS('/game');
	this.sock.onopen = $.proxy(this.onopen, this);
	this.sock.onmessage = $.proxy(this.onmessage, this);
	this.sock.onclose = $.proxy(this.onclose, this);

}
Game.prototype.onopen = function() {
	console.log('open');
};
Game.prototype.onmessage = function(e) {
	var msg = $.parseJSON(e.data);
	//console.log(msg.data.progress_move)
	this['_'+msg.type](msg.data);
};
Game.prototype.onclose = function() {
	console.log('close');
};
Game.prototype._init = function(data) {
	console.log(data.fen)
	var cfg = {
		showErrors: 'console',
		draggable: true,
		position: data.fen,
		orientation: (data.side=='w' ? 'white' : 'black'),
		onDragStart: $.proxy(this.onDragStart, this),
		onDrop: $.proxy(this.onDrop, this),
		onSnapEnd: $.proxy(this.onSnapEnd, this)
	};
	// sizing
	this.elms.board.width(this.size).height(this.size);
	this.elms.broadcast.height(this.size);
	this.elms.log.height(this.size-30);

	this.board = new ChessBoard(this.elms.board, cfg);
	this.chess = new Chess(data.fen);
	this.ctx = this.elms.votes[0].getContext('2d');


	this.elms.you_orientation.html('You are '+ (data.side=='w' ? 'White':'Black') );

	this.elms.switch_side.on('click', $.proxy(this.switchSide, this));
	this.elms.inputMsg.on('keypress', $.proxy(this.sendMsg, this));
	this.elms.sendMsg.on('click', $.proxy(this.sendMsg, this));

	this.fillStatusTurn();
};
Game.prototype._move = function(data){
	console.log(data)
	var serverMove = data.from+'-'+data.to;
	/*
	if (this.lastMove !== serverMove) {
		if (this.lastMove!=='') this.chess.undo();
		this.chess.move(data);
		this.board.position(this.chess.fen());
	}*/

	this.chess.move(data);
	this.board.position(this.chess.fen());
	this.lastMove = '';
	this.moveEnd();

	this.putLog(serverMove+(this.lastMove === serverMove ? '' : ' ('+this.lastMove+')'));
	this.fillStatusTurn();
};
Game.prototype._status = function(data){
	this.stat = data;
	this.fillStatus();
	this.drawVotes(data.moves);
};
Game.prototype._switchside = function(data){
	this.board.orientation(data.side);
	this.putLog('You moved to '+data.side+'('+data.reason+')');
	this.elms.you_orientation.html('You are '+ (data.side=='white' ? 'White':'Black') );
	this.turnAlert();
};
Game.prototype._newgame = function(data) {
	this.chess = new Chess();
	this.board.position('start');
	this.fillStatusTurn();
};
Game.prototype._userMsg = function(data) {
	this.putLog(data);
};

Game.prototype._send = function(data){
	if (typeof data === 'object') data = JSON.stringify(data).replace(/\//g, '\\/');
	this.sock.send(data);
};
Game.prototype.moveEnd = function() {

};
Game.prototype.sendMsg = function(e) {
	if ([1,13].indexOf(e.which)===-1 || this.elms.inputMsg.val().length===0) return;

	this._send({
		type: 'userMsg',
		data: this.board.orientation()[0] + ': ' + this.elms.inputMsg.val()
	});
	this.elms.inputMsg.val('');
};

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
Game.prototype.onDragStart = function(source, piece, position, orientation) {
	if (
		this.chess.in_checkmate() === true ||
			this.chess.in_draw() === true ||
			piece[0] !== orientation[0] ||
			this.chess.turn() !== orientation[0]
		){
		return false;
	}
};

Game.prototype.onDrop = function(source, target) {
	// see if the move is legal
	var move = this.chess.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a pawn for example simplicity
	});

	// illegal move
	if (move !== null) {
		this._send({
			type: 'move',
			data: move
		});
		this.lastMove = move.from+'-'+move.to;

		this.turnAlert();
		this.chess.undo();
	}

	return 'snapback';
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
Game.prototype.onSnapEnd = function() {
	this.board.position(this.chess.fen());
};

Game.prototype.putLog = function(msg) {
	var div = '<div>'+msg+'</div>';

	this.elms.log.append(div);

	// TODO scroll only if scroll in bottom
	this.elms.log.scrollTop(this.elms.log[0].scrollHeight);

};
Game.prototype.fillStatus = function() {
	var side = this.board.orientation()==='white' ? 'w' : 'b';

	this.elms.white_count.html(this.stat.players.w);
	this.elms.black_count.html(this.stat.players.b);

	if (side==='w') {
	} else {
	}
	this.elms['progress_move_'+this.chess.turn()]
		.attr('style', 'width:'+this.stat.progress_move+'%;');

};
Game.prototype.fillStatusTurn = function() {
	var status = '';
	var moveColor = 'White';
	if (this.chess.turn() === 'b') {
		moveColor = 'Black';
	}
	if (this.chess.in_checkmate() === true) {
		this.putLog('Game over, ' + moveColor + ' is in checkmate.');
		status = 'Game over, ' + moveColor + ' is in checkmate.';
	}	else if (this.chess.in_draw() === true) {
		this.putLog('Game over, drawn position');
		status = 'Game over, drawn position';
	}	else {
		status = moveColor + ' to move';
		if (this.chess.in_check() === true) {
			status += ', ' + moveColor + ' is in check';
		}
	}
	this.elms.game_status.html(status);
	this.turnAlert();
	this.fillStatus();
};
Game.prototype.switchSide = function() {
	this._send({
		type: 'switchside'
	});
};

Game.prototype.turnAlert = function() {
	var self = this;
	if (this.chess.turn() === this.board.orientation()[0] && this.lastMove==='') {
		this.elms.your_move
			.addClass('text-error')
			.removeClass('muted')
			.html('Move!');
		this.turnAlertTimer = setInterval(function(){
			self.elms.your_move
				.fadeOut('fast')
				.fadeIn('fast');
		}, 1000);
	} else {
		clearInterval(this.turnAlertTimer);
		this.elms.your_move.stop();
		this.elms.your_move
			.removeClass('text-error')
			.addClass('muted')
			.html('Wait.');
	}
};


/*
		canvas line with arrow
 */
function Line(x1,y1,x2,y2){
	this.x1=x1;
	this.y1=y1;
	this.x2=x2;
	this.y2=y2;
}
Line.prototype.drawWithArrowheads=function(ctx, width, own){

	// arbitrary styling
	ctx.strokeStyle = own ? 'red' : 'black';
	ctx.fillStyle = own ? 'red' : 'black';
	ctx.lineWidth=width||1;

	// draw the line
	ctx.beginPath();
	ctx.moveTo(this.x1,this.y1);
	ctx.lineTo(this.x2,this.y2);
	ctx.stroke();

	// draw the starting arrowhead
	var startRadians=Math.atan((this.y2-this.y1)/(this.x2-this.x1));
	startRadians+=((this.x2>this.x1)?-90:90)*Math.PI/180;
	this.drawArrowhead(ctx,this.x1,this.y1,startRadians);
	// draw the ending arrowhead
	/*
	 var endRadians=Math.atan((this.y2-this.y1)/(this.x2-this.x1));
	 endRadians+=((this.x2>this.x1)?90:-90)*Math.PI/180;
	 this.drawArrowhead(ctx,this.x2,this.y2,endRadians);
	 */

}
Line.prototype.drawArrowhead=function(ctx,x,y,radians){
	ctx.save();
	ctx.beginPath();
	ctx.translate(x,y);
	ctx.rotate(radians);
	ctx.moveTo(0,0);
	ctx.lineTo(5,10);
	ctx.lineTo(-5,10);
	ctx.closePath();
	ctx.restore();
	ctx.fill();
}


/*
		draw arrows with moves
	*/

Game.prototype.drawVotes = function(moves) {
	this.clearCtx();
	for (var k in moves) {
		if (moves.hasOwnProperty(k)) {
			this.drawVote(k, moves[k]);
		}
	}
}
function Votes(size) {

/*
	this._drawMove({from:'e2', to:'e4', piece:'p'}, 5);
	this._drawMove({from:'c2', to:'e2', piece:'p'}, 5);
	this._drawMove({from:'e8', to:'e6', piece:'p'}, 5);
	this._drawMove({from:'h2', to:'f2', piece:'p'}, 5);

	this._drawMove({from:'c6', to:'e4', piece:'p'}, 5);
	this._drawMove({from:'g2', to:'e4', piece:'p'}, 5);
	this._drawMove({from:'g6', to:'e4', piece:'p'}, 5);
	this._drawMove({from:'c2', to:'e4', piece:'p'}, 5);
*/

}
Game.prototype.clearCtx = function() {
	this.ctx.clearRect(0, 0, this.size, this.size);
};
Game.prototype.drawVote = function(move, votes) {
	move = JSON.parse(move);

	var from = [move.from.charCodeAt(0)-97, 8-move.from[1]];
	var to = [move.to.charCodeAt(0)-97, 8-move.to[1]];

	if (move.piece==='n') {
		// knight
	}

	var x, y;
	var fromX, fromY, toX, toY,
		fromCx, fromCy, toCx, toCy,
		fromSx, fromSy, toSx, toSy,
		xText, yText;

	// center of square
	fromCx = from[0] * this.sizeSquare + this.sizeSquareHalf;
	fromCy = from[1] * this.sizeSquare + this.sizeSquareHalf;
	toCx = to[0] * this.sizeSquare + this.sizeSquareHalf;
	toCy = to[1] * this.sizeSquare + this.sizeSquareHalf;

	// shift to center of corner or side
	fromSx = (from[0]>to[0] ? -this.sizeShift : this.sizeShift);
	toSx = (from[0]<to[0] ? -this.sizeShift : this.sizeShift);
	fromSy = (from[1]>to[1] ? -this.sizeShift : this.sizeShift);
	toSy = (from[1]<to[1] ? -this.sizeShift : this.sizeShift);
	if (from[0]===to[0]) { // vertical move, y in center
		fromSx = 0;
		toSx = 0;
		xText = toCx-2;
		yText = toCy + (from[1]>to[1] ? this.sizeShiftText:-this.sizeShiftText);
	}	else if (from[1]===to[1]) { // horizontal move, x in center
		fromSy = 0;
		toSy = 0;
		xText = toCx + (from[0]>to[0] ? this.sizeShiftText:-this.sizeShiftText);
		yText = toCy-2;
	}	else { //diagonal move
		xText = toCx + (from[0]>to[0] ? this.sizeShiftText:-this.sizeShiftText);
		yText = toCy + (from[1]>to[1] ? this.sizeShiftText:-this.sizeShiftText);
	}
	/*
	if (from[0]===to[0]) { // vertical move, y in center
		x = 2;
		y = (from[1]>to[1] ? 0 : 4);
	}	else if (from[1]===to[1]) { // horizontal move, x in center
		x = (from[0]>to[0] ? 4 : 0);
		y = 2;
	}	else { //diagonal move
		x = (from[0]>to[0] ? 4 : 0);
		y = (from[1]>to[1] ? 0 : 4);
	}
	var fromX = (from[0]-1) * this.size5 + x * this.size55 + this.size552;
	var fromY = (9-from[1]-1) * this.size5 + x * this.size55 + this.size552;

	var toX = (to[0]-1) * this.size5 + x * this.size55 + this.size552;
	var toY = (9-to[1]-1) * this.size5 + x * this.size55 + this.size552;
*/


	fromX = fromCx + fromSx;
	fromY = fromCy + fromSy;
	toX = toCx + toSx;
	toY = toCy + toSy;

	if (this.board.orientation()=='black') {
		fromX = this.size-fromX;
		fromY = this.size-fromY;
		toX = this.size-toX;
		toY = this.size-toY;
		xText = this.size-xText;
		yText = this.size-yText;
	}
	this.ctx.textBaseline = "middle";
	this.ctx.textAlign = "center";
	this.ctx.fillText(votes, xText, yText);
/*
	console.log(from, to)
	console.log(this.size8)
	console.log(this.size85)

	console.log(fromCx, fromCy, toCx, toCy)
	console.log( toX, toY, fromX, fromY)
*/
// create a new line object
	var line=new Line( toX-1, toY-1, fromX, fromY);
// draw the line
	var width = ~~votes/this.stat.players[this.chess.turn()]*5;
	line.drawWithArrowheads(this.ctx, width, (this.lastMove===move.from+'-'+move.to));

}