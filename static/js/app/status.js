define([
  'jquery'
],function($) {


  var data = {
    turn: 'w',
    players: {
      w: 0,
      b: 0
    },
    moves: {}, // array of votes
    progress_move: {} // % of time to end turn
  };

  var elms = {
    log: $('#log'),
    game_status: $('#game_status'),
    progress: {
      w: $('#progress_move_w'),
      b: $('#progress_move_b')
    },
    count: {
      w:$('#white_count'),
      b:$('#black_count')
    },
    you_orientation: $('#you_orientation'),
    your_move: $('#your_move')
  };


  var update = {
    progress: function(side, progress) {
      elms.progress[side].attr('style', 'width:' + progress + '%;');
    },
    count: function(count) {
      elms.count.w.html(count.w);
      elms.count.b.html(count.b);
    },
    gameStatus: function(status) {
      elms.game_status.html(status);
    },
    side: function(side) {
      elms.you_orientation.html('You are ' + (side[0] === 'w' ? 'White' : 'Black'));
    }
  };
  var log = function(msg) {
    elms.log.append('<div>' + msg + '</div>');
    // TODO scroll only if scroll in bottom
    elms.log.scrollTop(elms.log[0].scrollHeight);
  };

  var status = {};

  status.turnAlert = function(turnOn) {
    if (turnOn) {
      elms.your_move
        .addClass('text-error')
        .removeClass('muted')
        .html('Move!');
      this.turnAlertTimer = setInterval(function() {
        elms.your_move
          .fadeOut('fast')
          .fadeIn('fast');
      }, 1000);
    } else {
      clearInterval(this.turnAlertTimer);
      elms.your_move.stop();
      elms.your_move
        .removeClass('text-error')
        .addClass('muted')
        .html('Wait.');
    }
  };
  status.writeMsg = function(msg) {
    log(msg);
  };

  status.newSide = function(side) {
    log('You joined to ' + (side[0] === 'w' ? 'white' : 'black') + ' side');
    update.side(side);
  };
  status.newData = function(data) {
    // moves {}; players: b,w; progress_move %; turn;
    update.count(data.players);
    update.progress(data.turn, data.progress_move);

  };
  status.newTurn = function(move) {
    update.progress('w', 0);
    update.progress('b', 0);
    log(move);
  };
  status.newGame = function() {
    log('New game started');
  };

  return status;
});