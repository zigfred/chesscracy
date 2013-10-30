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

    this.sock = sock($.proxy(this.sockMessage, this), $.proxy(this.status.lostConnection, this));

  }


  Game.prototype.sockMessage = function(data) {
    console.log(data.type, data.data);
    this['ws_' + data.type](data.data);
  };

  /*
   board handlers
   */
  function onDragStart(source, piece, position, orientation) {
    return !(
        this.board.chess.game_over() === true ||
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
console.log(move)
    if (move !== null) {
      this._send({
        type: 'vote',
        data: move.san
      });
      this.myVote = move.san;
      this.board.chess.undo();
      this.status.turnAlert(false);
    }
    return 'snapback';
  }

   /*
   ws handlers
   */
  Game.prototype.ws_players = function(data) {
    this.status.updatePlayers(data);
  };

  Game.prototype.ws_start = function(data) {

    this.board = board({
      el: this.elms.board,
      side: data.side,
      fen: data.fen,
      pgn: data.pgn,
      onDragStart: $.proxy(onDragStart, this),
      onDrop: $.proxy(onDrop, this)
    });


    this.votes = Votes('votes', this.size);

    this.myVote = '';

    this.status.writeHistory(this.board.chess.history({verbose:true}));
    this.status.newSide(data.side);
    this.status.turnAlert(data.side === this.board.chess.turn());
    this.status.updatePlayers(data.count);
    this.status.progress.start(data.side, data.progress);

    this.elms.switch_side.on('click', $.proxy(this.switchSide, this));
    this.elms.inputMsg.on('keypress', $.proxy(this.sendMsg, this));
    this.elms.sendMsg.on('click', $.proxy(this.sendMsg, this));
    $(document).keydown(function() {
      $('#inputMsg').focus();
    });

  };
  Game.prototype.ws_move = function(data) {
    var result = false,
      color = this.board.chess.turn();
    this.board.chess.move(data);
    this.board.position(this.board.chess.fen());
    this.myVote = '';
    this.votes({}); //clear votes

    this.status.endTurn(data, Math.ceil(this.board.chess.history().length / 2), color);

    if (result = this.board.checkGameOver()) {
      this.status.gameOver(result);
    } else {
      this.status.turnAlert(this.board.orientation()[0] === this.board.chess.turn());
    }
  };
  Game.prototype.ws_switchside = function() {
    var newSide = this.board.orientation() === 'white' ? 'black' : 'white';
    this.board.orientation(newSide);

    this.status.newSide(newSide[0]);
    this.status.turnAlert(newSide[0] === this.board.chess.turn());
  };
  Game.prototype.ws_newgame = function(data) {
    this.board.newGame();
    this.status.newGame();
    this.status.turnAlert(this.board.orientation()[0] === this.board.chess.turn());
  };
  Game.prototype.ws_say = function(data) {
    this.status.writeMsg(data);
  };
  Game.prototype.ws_votes = function(votes) {
    this.votes(votes, this.board.orientation(), this.myVote, this.status.getPlayers[this.board.chess.turn()]);
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
      type: 'say',
      data: this.elms.inputMsg.val()
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