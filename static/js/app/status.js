define([
  'jquery'
],function($) {


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
      elms.count.w.text(count.w);
      elms.count.b.text(count.b);
    },
    gameStatus: function(status) {
      elms.game_status.text(status);
    },
    side: function(side) {
      elms.you_orientation.text('You are ' + (side[0] === 'w' ? 'White' : 'Black'));
    }
  };
  var progress = {
    reset: function() {
      update.progress('w', 0);
      update.progress('b', 0);
      clearInterval(this.intervalId);
      this.side = '';
    },
    start: function(side, endTurnTime) {
      this.reset();
      this.endTurnTime = new Date(endTurnTime);
      this.side = side;
      update.progress(side, (this.endTurnTime - new Date())/10/20);
      this.intervalId = setInterval(this.downProgress.bind(this), 200);
    },
    downProgress: function() {
      update.progress(this.side, (this.endTurnTime - new Date())/10/20);
    }
  };
  var log = function(msg, css) {
    elms.log.append('<div class="' + (css || ' ') + '">' + msg + '</div>');
    // TODO scroll only if scroll in bottom
    elms.log.scrollTop(elms.log[0].scrollHeight);
  };

  var status = {};

  status.turnAlert = function(turnOn) {
    elms.your_move
      .removeClass('muted')
      .removeClass('text-error');
    clearInterval(this.turnAlertTimer);

    if (turnOn) {
      elms.your_move
        .addClass('text-error')
        .html('Move!');
      this.turnAlertTimer = setInterval(function() {
        elms.your_move
          .fadeOut('fast')
          .fadeIn('fast');
      }, 1000);
    } else {
      elms.your_move.stop();
      elms.your_move
        .addClass('muted')
        .html('Wait.');
    }
  };
  status.writeMsg = function(data) {
    var div = $('<div class="chat"></div>');
    div.text(data.side + ': ' + data.msg);
    elms.log.append(div);
    elms.log.scrollTop(elms.log[0].scrollHeight);
  };

  status.newSide = function(side) {
    log('You joined to ' + (side[0] === 'w' ? 'white' : 'black') + ' side', 'info');
    update.side(side);
  };
  status.updatePlayers = function(data) {
    update.count(data);
  };
  status.getPlayers = function(side) {
    return elms.count[side][0].innerHTML;
  };
  status.endTurn = function(data, n, color) {
    progress.start(color === 'w' ? 'b' : 'w', data.endTurnTime);

    if (color === 'b') {
      var last = elms.log.children().last();
      if (last.hasClass('move')) {
        last.children().last().html(data.move).addClass('label-success');
        return;
      }
    }

    var html = '';
    html += '<span class="label">' + n + ':</span>';
    html += ' <span class="label' + (color === 'w' ? ' label-success">' + data.move : '">...') + '</span>';
    html += ' <span class="label' + (color === 'b' ? ' label-success">' + data.move : '">...') + '</span>';

    log(html, 'move');
  };
  status.newGame = function() {
    progress.reset();
    log('New game started', 'info');
  };
  status.gameOver = function(result) {
    progress.reset();
    log(result, 'warning');
    log('will restart in 30s', 'info');
    status.turnAlert(false);
  };
  status.writeHistory = function(history) {
    var i = 1;
    while (history.length) {
      status.endTurn({move: history.shift().san}, Math.ceil(i++ / 2), i%2 ? 'b' : 'w');
    }
  };
  status.lostConnection = function() {
    log('Connection lost', 'error');
  };

  status.progress = progress;
  return status;
});