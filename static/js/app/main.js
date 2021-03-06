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
      sendMsg: $('#sendMsg'),
      surrenderBtn: $("#surrenderBtn")
    };
    $(document).on('click', ':button.savePgn', this.savePgn.bind(this));
    this.elms.surrenderBtn.click(this.handleSurrender.bind(this));
    $("#helpTab a").click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });

    // local time shift relative to server time. will calc in ws_move
    this.localTimeShift = 0;

    this.surrender = {
      happen: false
    };

    // sizing
    var size = parseInt(this.elms.board.css('width'), 10);
    this.size = size - size % 8;
    this.elms.broadcast.height(this.size);
    this.elms.log.height(this.size - 30);

    this.status = status;

    this.sock = sock(this.sockMessage.bind(this), this.status.lostConnection);

  }


  /*
   handlers
   */
  Game.prototype.onDragStart = function(source, piece, position, orientation) {
    return !(
        this.board.chess.game_over() === true ||
        piece[0] !== orientation[0] ||
        this.board.chess.turn() !== orientation[0] ||
        this.surrender.happen
      );
  };
  Game.prototype.onDrop = function(source, target) {
    var move = this.board.chess.move({
      from: source,
      to: target,
      promotion: 'q'
    });

    if (move !== null) {
      this._send({
        type: 'vote',
        data: move.san
      });
      this.myVote = move.san;
      this.board.chess.undo();
    }
    return 'snapback';
  };
  Game.prototype.sendMsg = function(e) {
    if ([1, 13].indexOf(e.which) === -1 || this.elms.inputMsg.val().length === 0) {
      return;
    }

    this._send({
      type: 'say',
      data: this.elms.inputMsg.val().slice(0, 140)
    });
    this.elms.inputMsg.val('');
  };
  Game.prototype.switchSide = function() {
    this._send({
      type: 'switchside'
    });
  };
  Game.prototype.savePgn = function(e) {
    if (!confirm("Use it only for epic games. Are you sure want save this game?")) return;
    var btn = $(e.currentTarget);
    btn.attr('disabled', true);
    this._send({
      type: 'savepgn',
      data: {
        pgn: btn.data('pgn')
      }
    });
  };
  Game.prototype.handleSurrender = function(e) {
    var btn = $(e.currentTarget);
    var status = !btn.hasClass('active');

    this._send({
      type: 'surrender',
      data: {
        surrender: status
      }
    });
  };

   /*
   ws handlers
   */
  Game.prototype.sockMessage = function(data) {
    this['ws_' + data.type](data.data);
  };

  Game.prototype.ws_players = function(data) {
    this.status.players(data);
  };

  Game.prototype.ws_start = function(data) {

    this.board = board({
      el: this.elms.board,
      side: data.side,
      fen: data.fen,
      pgn: data.pgn,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this)
    });


    this.votes = Votes('votes', this.size);

    this.myVote = '';

    this.surrender = data.surrender;

    this.status.start(data, this.board.chess.history({verbose:true}), this.board.chess.turn());

    this.elms.switch_side.on('click', this.switchSide.bind(this));
    this.elms.inputMsg.on('keypress', this.sendMsg.bind(this));
    this.elms.sendMsg.on('click', this.sendMsg.bind(this));
    $(document).keydown(function() {
      $('#inputMsg').focus();
    });

  };
  Game.prototype.ws_move = function(data) {
    this.localTimeShift = new Date() - data.endTurnTime;
    var result = false,
      color = this.board.chess.turn();
    this.board.chess.move(data.move);
    this.board.position(this.board.chess.fen());
    this.myVote = '';
    this.votes({}); //clear votes

    this.status.move({
      endTurnTime: data.endTurnTime,
      move: data.move,
      turnNumber: Math.ceil(this.board.chess.history().length / 2),
      turnColor: color,
      orientation: this.board.orientation()[0],
      gameover: this.board.checkGameOver(),
      pgn: this.board.chess.pgn(),
      localTimeShift: this.localTimeShift
    });
  };
  Game.prototype.ws_switchside = function() {
    var newSide = this.board.orientation() === 'white' ? 'black' : 'white';
    this.board.orientation(newSide);
    this.myVote = '';

    this.status.switchSide(newSide[0], this.board.chess.turn());
  };
  Game.prototype.ws_newgame = function(data) {
    this.surrender.happen = false;
    this.board.newGame();
    this.status.newGame(this.board.orientation()[0], data.endTurnTime);
  };
  Game.prototype.ws_say = function(data) {
    this.status.say(data);
  };
  Game.prototype.ws_votes = function(data) {
    this.votes(data.votes, this.board.orientation(), this.myVote, data.totalVoters);
  };
  Game.prototype.ws_pgnlink = function(data) {
    this.status.updatePgnLink(data);
  };
  Game.prototype.ws_surrender = function(data) {
    var pgn = '';
    if (data.happen) {
      this.surrender = data;
      pgn = this.board.chess.pgn();
    }
    this.status.updateSurrender(data, this.board.orientation()[0], pgn);
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


  var game = new Game();

});