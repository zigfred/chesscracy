define([
], function() {

  return function(options) {

    var cfg = {
      showErrors: 'console',
      draggable: true,
      position: options.fen,
      orientation: (options.side[0] === 'w' ? 'white' : 'black'),
      onDragStart: options.onDragStart,
      onDrop: options.onDrop,
      onSnapEnd: options.onSnapEnd,
      pieceTheme: 'img/chesspieces/small/{piece}.png'
    };

    var board = new ChessBoard(options.el, cfg);

    board.chess = new Chess(options.fen);
    board.newGame = function() {
      this.chess = new Chess();
      this.position('start');
    };

    return board;
  };

});