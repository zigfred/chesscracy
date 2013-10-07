"use strict";
$(window).load(function () {
  window.game = new Game();

  $(document).keydown(function() {
    $('#inputMsg').focus();
  });
});

function Game() {

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
    players: {w: 0, b: 0}
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
  this['_' + msg.type](msg.data);
};
Game.prototype.onclose = function() {
  console.log('close');
};
Game.prototype._init = function(data) {
  var size,
    cfg = {
      showErrors: 'console',
      draggable: true,
      position: data.fen,
      orientation: (data.side === 'w' ? 'white' : 'black'),
      onDragStart: $.proxy(this.onDragStart, this),
      onDrop: $.proxy(this.onDrop, this),
      onSnapEnd: $.proxy(this.onSnapEnd, this),
      pieceTheme: 'img/chesspieces/small/{piece}.png'
    };

  this.board = new ChessBoard(this.elms.board, cfg);
  size = parseInt(this.elms.board.css('width'), 10);
  this.size = size - size % 8;
  this.sizeSquare = (this.size / 8);
  this.sizeSquareHalf = (this.size / 8 / 2);
  this.sizeShift = (this.size / 8 / 2 * 0.96);
  this.sizeShiftText = (this.size / 8 / 2 * 0.80);

// sizing
  this.elms.board.width(this.size).height(this.size);
  this.elms.broadcast.height(this.size);
  this.elms.log.height(this.size - 30);

  this.chess = new Chess(data.fen);

  this.votes = new Svg('votes', this.size);

  this.elms.you_orientation.html('You are ' + (data.side === 'w' ? 'White' : 'Black'));

  this.elms.switch_side.on('click', $.proxy(this.switchSide, this));
  this.elms.inputMsg.on('keypress', $.proxy(this.sendMsg, this));
  this.elms.sendMsg.on('click', $.proxy(this.sendMsg, this));

  this.fillStatusTurn();
};
Game.prototype._move = function(data) {
  var serverMove = data.from + '-' + data.to;
  this.chess.move(data);
  this.board.position(this.chess.fen());
  this.lastMove = '';
  this.moveEnd();

  this.putLog(serverMove + (this.lastMove === serverMove ? '' : ' (' + this.lastMove + ')'));
  this.fillStatusTurn();
};
Game.prototype._status = function(data) {
  this.stat = data;
  this.fillStatus();
  this.drawVotes(data.moves);
};
Game.prototype._switchside = function(data) {
  this.board.orientation(data.side);
  this.putLog('You moved to ' + data.side + '(' + data.reason + ')');
  this.elms.you_orientation.html('You are ' + (data.side === 'white' ? 'White' : 'Black'));
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

Game.prototype._send = function(data) {
  if (typeof data === 'object') {
    data = JSON.stringify(data).replace(/\//g, '\\/');
  }
  this.sock.send(data);
};
Game.prototype.moveEnd = function() {

};
Game.prototype.sendMsg = function(e) {
  if ([1, 13].indexOf(e.which) === -1 || this.elms.inputMsg.val().length === 0) {
    return;
  }

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
    ) {
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
    this.lastMove = move.from + '-' + move.to;

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
  var div = '<div>' + msg + '</div>';

  this.elms.log.append(div);

// TODO scroll only if scroll in bottom
  this.elms.log.scrollTop(this.elms.log[0].scrollHeight);

};
Game.prototype.fillStatus = function() {
  var side = this.board.orientation() === 'white' ? 'w' : 'b';

  this.elms.white_count.html(this.stat.players.w);
  this.elms.black_count.html(this.stat.players.b);

  this.elms['progress_move_' + this.chess.turn()]
    .attr('style', 'width:' + this.stat.progress_move + '%;');

};
Game.prototype.fillStatusTurn = function() {
  var status = '',
    moveColor = 'White';
  if (this.chess.turn() === 'b') {
    moveColor = 'Black';
  }
  if (this.chess.in_checkmate() === true) {
    this.putLog('Game over, ' + moveColor + ' is in checkmate.');
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  } else if (this.chess.in_draw() === true) {
    this.putLog('Game over, drawn position');
    status = 'Game over, drawn position';
  } else {
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
  if (this.chess.turn() === this.board.orientation()[0] && this.lastMove === '') {
    this.elms.your_move
      .addClass('text-error')
      .removeClass('muted')
      .html('Move!');
    this.turnAlertTimer = setInterval(function() {
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
 draw arrows with moves
 */

Game.prototype.drawVotes = function(moves) {
  this.votes.clear();
  for (var k in moves) {
    if (moves.hasOwnProperty(k)) {
      this.drawVote(k, moves[k]);
    }
  }
};

Game.prototype.drawVote = function(move, votes) {
  if (typeof move === 'string') {
    move = JSON.parse(move);
  }

  var x, y,
    fromX, fromY, toX, toY,
    fromCx, fromCy, toCx, toCy,
    fromSx, fromSy, toSx, toSy,
    xText, yText,
    from = [move.from.charCodeAt(0) - 97, 8 - move.from[1]],
    to = [move.to.charCodeAt(0) - 97, 8 - move.to[1]];

  if (move.piece === 'n') {
    // knight
  }


  // center of square
  fromCx = from[0] * this.sizeSquare + this.sizeSquareHalf;
  fromCy = from[1] * this.sizeSquare + this.sizeSquareHalf;
  toCx = to[0] * this.sizeSquare + this.sizeSquareHalf;
  toCy = to[1] * this.sizeSquare + this.sizeSquareHalf;

  // shift to center of corner or side
  fromSx = (from[0] > to[0] ? -this.sizeShift : this.sizeShift);
  toSx = (from[0] < to[0] ? -this.sizeShift : this.sizeShift);
  fromSy = (from[1] > to[1] ? -this.sizeShift : this.sizeShift);
  toSy = (from[1] < to[1] ? -this.sizeShift : this.sizeShift);
  if (from[0] === to[0]) { // vertical move, y in center
    fromSx = 0;
    toSx = 0;
    xText = fromCx;
    yText = fromCy + (from[1] > to[1] ? -this.sizeShiftText:this.sizeShiftText);
  } else if (from[1] === to[1]) { // horizontal move, x in center
    fromSy = 0;
    toSy = 0;
    xText = fromCx + (from[0] > to[0] ? -this.sizeShiftText:this.sizeShiftText);
    yText = fromCy;
  } else { //diagonal move
    xText = fromCx + (from[0] > to[0] ? -this.sizeShiftText:this.sizeShiftText);
    yText = fromCy + (from[1] > to[1] ? -this.sizeShiftText:this.sizeShiftText);
  }

  fromX = fromCx + fromSx;
  fromY = fromCy + fromSy;
  toX = toCx + toSx;
  toY = toCy + toSy;

  if (this.board.orientation() === 'black') {
    fromX = this.size - fromX;
    fromY = this.size - fromY;
    toX = this.size - toX;
    toY = this.size - toY;
    xText = this.size - xText;
    yText = this.size - yText;
  }

  // draw the line
  var width = ~~votes / this.stat.players[this.chess.turn()] * 5;

  this.votes.arrow({
    x1: Math.round(fromX),
    y1: Math.round(fromY),
    x2: Math.round(toX),
    y2: Math.round(toY),
    stroke: width,
    mine: (this.lastMove === move.from + '-' + move.to),
    tX: Math.round(xText),
    tY: Math.round(yText),
    text: votes
  });
};

var Svg = (function() {
  function Svg(id, size) {
    var el = document.getElementById(id),
      xmlns = "http://www.w3.org/2000/svg",
      svgElem = document.createElementNS(xmlns, "svg"),
      defs = document.createElementNS(xmlns, "defs"),
      marker = document.createElementNS(xmlns, "marker"),
      markerGreen = document.createElementNS(xmlns, "marker"),
      mpath = document.createElementNS(xmlns, "path"),
      mpathGreen = document.createElementNS(xmlns, "path");

    svgElem.setAttribute("width", size);
    svgElem.setAttribute("height", size);
    mpath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    mpathGreen.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    this.setAttr(marker, {
      id: 'ArrowHead',
      viewBox: '0 0 10 10',
      refX: 0,
      refY: 5,
      markerUnits: 'strokeWidth',
      markerWidth: 4,
      markerHeight: 3,
      orient: 'auto',
      fill: 'gray'
    });
    this.setAttr(markerGreen, {
      id: 'ArrowHeadGreen',
      viewBox: '0 0 10 10',
      refX: 0,
      refY: 5,
      markerUnits: 'strokeWidth',
      markerWidth: 4,
      markerHeight: 3,
      orient: 'auto',
      fill: 'green'
    });

    svgElem.appendChild(defs);
    markerGreen.appendChild(mpathGreen);
    marker.appendChild(mpath);
    defs.appendChild(markerGreen);
    defs.appendChild(marker);

    this.svgElem = svgElem;
    this.xmlns = xmlns;
    this.lines = [];
    el.appendChild(svgElem);
  }

  Svg.prototype.setAttr = function(el, attr) {
    for (var i in attr) {
      if (attr.hasOwnProperty(i)) {
        el.setAttribute(i, attr[i]);
      }
    }
  };
  Svg.prototype.arrow = function(attr) {
    var g = document.createElementNS(this.xmlns, "g");
    var path = document.createElementNS(this.xmlns, "path");
    var text = document.createElementNS(this.xmlns, "text");
    this.setAttr(path, {
      d: 'M ' + attr.x1 + ' ' + attr.y1 + ' L ' + attr.x2 + ' ' + attr.y2,
      fill: 'none',
      stroke: attr.mine ? 'green' : 'gray',
      'stroke-width': (attr.stroke || 1),
      'marker-end': 'url(#ArrowHead' + (attr.mine ? 'Green' : '') + ')'
    });
    this.setAttr(text, {
      x: attr.tX,
      y: attr.tY,
      'text-anchor': 'middle',
      'alignment-baseline': 'middle',
      'font-size': 10,
      'fill': "black",
      'font-weight': 'bold'
    });
    text.appendChild(document.createTextNode(attr.text));
    g.appendChild(path);
    g.appendChild(text);
    this.svgElem.appendChild(g);
    this.lines.push(g);
  };
  Svg.prototype.clear = function() {
    while (this.lines.length) {
      this.svgElem.removeChild(this.lines.pop());
    }
  };
  return Svg;
}
  )();

function test() {

  game.drawVote({from:"e2", to:"e4", piece:"p"}, 3.5);
  game.drawVote({from:"c4", to:"e4", piece:"p"}, 3.2);
  game.drawVote({from:"e6", to:"e4", piece:"p"}, 3.5);
  game.drawVote({from:"g4", to:"e4", piece:"p"}, 3.3);

  game.drawVote({from:"c6", to:"e4", piece:"p"}, 3.7);
  game.drawVote({from:"g2", to:"e4", piece:"p"}, 3.3);
  game.drawVote({from:"g6", to:"e4", piece:"p"}, 3.2);
  game.drawVote({from:"c2", to:"e4", piece:"p"}, 3.4);
}