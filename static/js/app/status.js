define([
  'jquery'
],function($) {


  var elms = {
    log: $('#log'),
    progress: {
      w: $('#progress_move_w'),
      b: $('#progress_move_b')
    },
    count: {
      w:$('#white_count'),
      b:$('#black_count')
    },
    surrender: $('#surrenderBtn'),
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
      update.progress(side, (this.endTurnTime - new Date()) / 10 / this.vTime * 1000);
      this.intervalId = setInterval(this.downProgress.bind(this), 200);
    },
    downProgress: function() {
      update.progress(this.side, (this.endTurnTime - new Date()) / 10 / this.vTime * 1000);
    }
  };

  function log(msg, css) {
    elms.log.append('<div class="' + (css || ' ') + '">' + msg + '</div>');
    elms.log.scrollTop(elms.log[0].scrollHeight);
  }
  function writeHistory(history) {
    var i = 1;
    while (history.length) {
      appendMoveToLog(history.shift().san, Math.ceil(i++ / 2), i%2 ? 'b' : 'w');
    }
  }
  function appendMoveToLog(move, turnNumber, color) {
    // disable move logging
    return;
    if (color === 'b') {
      var last = elms.log.children().last();
      if (last.hasClass('move')) {
        last.children().last().text(move).addClass('label-success');
        return;
      }
    }

    var html = '';
    html += '<span class="label">' + turnNumber + ':</span>';
    html += ' <span class="label' + (color === 'w' ? ' label-success">' + move : '">...') + '</span>';
    html += ' <span class="label' + (color === 'b' ? ' label-success">' + move : '">...') + '</span>';

    log(html, 'move');
  }
  function changeSide(side) {
    log('You joined to ' + (side[0] === 'w' ? 'white' : 'black') + ' side', 'info');
    update.side(side);
  }
  function turnAlert(turnOn) {
    if (turnOn) {
      elms.your_move
        .removeClass('muted')
        .addClass('text-error')
        .html('Vote!');
    } else {
      elms.your_move
        .removeClass('text-error')
        .addClass('muted')
        .html('Wait.');
    }
  }
  function gameOver(msg, pgn) {
    // stop progress
    progress.reset();
    // write logs
    log(msg, 'warning');
    var btn = '<button data-pgn="' + pgn
      + '" type="button" class="btn savePgn" >Save pgn</button>';
    elms.log.append(btn);
    log('new game will start in 30s', 'info');
    // turn alert
    turnAlert(false);
  }


  return {
    start: function(data, history, turnColor) {
      // write history
      writeHistory(history);
      // show side
      changeSide(data.side);
      // turn alert
      turnAlert(data.side === turnColor);
      // show players
      update.count(data.count);
      // start progress
      progress.vTime = data.vTime || 20 * 1000;
      progress.start(turnColor, data.endTurnTime);
      // update surrender status
      this.updateSurrender(data.surrender, data.side, data.pgn);
    },
    newGame: function(orientation, endTurnTime) {
      // start progress
      progress.start(orientation, endTurnTime);
      // turn alert
      turnAlert(orientation === 'w');
      // write log
      log('New game started', 'info');
      // enable and update surrender button
      elms.surrender.removeClass('active').text('Surrender: 0').removeAttr("disabled");
    },
    move: function(data) {
      // restart progress
      progress.start(
        data.turnColor === 'w' ? 'b' : 'w',
        data.endTurnTime + data.localTimeShift + progress.vTime
      );
      // turn alert
      turnAlert(data.turnColor !== data.orientation);
      // write log
      appendMoveToLog(data.move, data.turnNumber, data.turnColor);
      // check gameover
      if (data.gameover) {
        // gameover
        gameOver(data.gameover, data.pgn);
      }
    },
    players: function(data) {
      // update players
      update.count(data);
    },
    switchSide: function(side, orientation) {
      // rewrite side
      changeSide(side);
      // turn alert
      turnAlert(side === orientation);
    },
    updatePgnLink: function(data) {
      if (typeof data.error !== 'undefined') {
        $(':button.savePgn[data-pgn="' + data.pgn + '"]')
          .replaceWith('<div class="warning">Error saving game: ' + data.error + '</div>');
      } else {
        var link = '<div class="info"><a data-pgn="' + data.pgn
          + '" href="http://www.chesspastebin.com/?p=' + data.id
          + '" target="_blank">View game</a></div>';
        $(':button.savePgn[data-pgn="' + data.pgn + '"]').replaceWith(link);
      }
    },
    updateSurrender: function(data, orientation, pgn){
      // update button text
      elms.surrender.text('Surrender: ' + data[orientation]);
      // game over
      if (data.happen) {
        gameOver('The ' + (data.side === 'w' ? 'white' : 'black') + ' side surrendered', pgn);
        elms.surrender.attr("disabled", "disabled");
      }
    },
    say: function(data) {
      //write msg
      var div = $('<div class="chat"></div>');
      div.text(data.side + ': ' + data.msg);
      elms.log.append(div);
      elms.log.scrollTop(elms.log[0].scrollHeight);
    },
    lostConnection: function() {
      log('Connection lost', 'error');
    }
  };

});