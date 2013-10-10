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
  var log = function(msg, css) {
    elms.log.append('<div class="' + (css || ' ') + '">' + msg + '</div>');
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
  status.writeMsg = function(data) {
    log(data.side + ': ' + data.msg, 'chat');
  };

  status.newSide = function(side) {
    log('You joined to ' + (side[0] === 'w' ? 'white' : 'black') + ' side', 'info');
    update.side(side);
  };
  status.newData = function(data) {
    // moves {}; players: b,w; progress_move %; turn;
    update.count(data.players);
    update.progress(data.turn, data.progress_move);

  };
  status.newTurn = function(move, n) {
    update.progress('w', 0);
    update.progress('b', 0);

    if (move.color === 'b') {
      var last = elms.log.children().last();
      if (last.hasClass('move')) {
        last.children().last().html(move.san).addClass('label-success');
        return;
      }
    }

    var html = '';
    html += '<span class="label">' + n + ':</span>';
    html += ' <span class="label' + (move.color === 'w' ? ' label-success">' + move.san : '">...') + '</span>';
    html += ' <span class="label' + (move.color === 'b' ? ' label-success">' + move.san : '">...') + '</span>';

    log(html, 'move');
  };
  status.newGame = function() {
    update.progress('w', 0);
    update.progress('b', 0);
    log('New game started', 'info');
  };
  status.gameOver = function(result) {
    update.progress('w', 0);
    update.progress('b', 0);
    log(result, 'warning');
  };
  status.writeHistory = function(history) {
    var i = 1;
    while (history.length) {
      status.newTurn(history.shift(), Math.ceil(i++ / 2));
    }
  };
  status.lostConnection = function() {
    log('Connection lost', 'error');
  };

  return status;
});