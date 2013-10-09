define([
  "jquery",
  'bootstrap',
  'app/sock',
  'app/status',
  'app/votes',
  'app/board',
  'app/error'
], function($, tb, sock, status, Votes, board, error) {




  function Game() {

    this.elms = {
      board: $('#board'),
      votes: $('#votes'),
      switch_side: $('#switch_side'),
      broadcast: $('#broadcast'),
      log: $('#log'),
      inputMsg: $('#inputMsg'),
      sendMsg: $('#sendMsg')
    };

    // sizing
    var size = parseInt(this.elms.board.css('width'), 10);
    this.size = size - size % 8;
    this.elms.broadcast.height(this.size);
    this.elms.log.height(this.size - 30);

    this.status = status;

    this.sock = sock($.proxy(this.sockMessage, this));

  }


  Game.prototype.sockMessage = function(data) {
    this[data.type](data.data);
  };

  /*
   board handlers
   */
  function onDragStart(source, piece, position, orientation) {
    return !(
        this.board.chess.in_checkmate() === true ||
        this.board.chess.in_draw() === true ||
        piece[0] !== orientation[0] ||
        this.board.chess.turn() !== orientation[0] ||
        this.myVote !== ''
      );
  }
  function onDrop(source, target) {
    var move = this.board.chess.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a pawn for example simplicity
    });

    if (move !== null) {
      this._send({
        type: 'move',
        data: move
      });
      this.myVote = move.from + '-' + move.to;
      this.board.chess.undo();
      this.status.turnAlert(false);
    }
    return 'snapback';
  }

   /*
   ws handlers
   */
  Game.prototype.start = function(data) {

    this.board = board({
      el: this.elms.board,
      side: data.side,
      fen: data.fen,
      onDragStart: $.proxy(onDragStart, this),
      onDrop: $.proxy(onDrop, this)
    });


    this.votes = Votes('votes', this.size);

    this.myVote = '';

    this.status.newSide(data.side);
    this.status.turnAlert(data.side === this.board.chess.turn());

    this.elms.switch_side.on('click', $.proxy(this.switchSide, this));
    this.elms.inputMsg.on('keypress', $.proxy(this.sendMsg, this));
    this.elms.sendMsg.on('click', $.proxy(this.sendMsg, this));
    $(document).keydown(function() {
      $('#inputMsg').focus();
    });

  };
  Game.prototype.move = function(data) {
    var serverMove = data.from + '-' + data.to;
    this.board.chess.move(data);
    this.board.position(this.board.chess.fen());
    this.myVote = '';
    //this.votes.clear();

    this.status.newTurn(serverMove);
    this.status.turnAlert(this.board.orientation()[0] === this.board.chess.turn());
  };
  Game.prototype.getStatus = function(data) {
    this.stat = data;
    this.status.newData(data);
    this.votes(data.moves, this.board.orientation(), this.myVote, this.stat.players[this.board.chess.turn()]);
  };
  Game.prototype.switchside = function(data) {
    this.board.orientation(data.side);

    this.status.newSide(data.side);
    this.status.turnAlert(data.side[0] === this.board.chess.turn());
  };
  Game.prototype.newgame = function(data) {
    this.board.newGame();
    this.status.newGame();
  };
  Game.prototype.userMsg = function(data) {
    this.status.writeMsg(data);
  };

  /*
  methods
   */
  Game.prototype._send = function(data) {
    if (typeof data === 'object') {
      data = JSON.stringify(data).replace(/\//g, '\\/');
    }
    this.sock.send(data);
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


  Game.prototype.switchSide = function() {
    this._send({
      type: 'switchside'
    });
  };


  var game = new Game();

});