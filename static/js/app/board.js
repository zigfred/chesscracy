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
    board.chess.load_pgn(options.pgn);

    board.checkGameOver = function() {
      var result = false;

      if (this.chess.in_checkmate()) {
        result = 'Mate for ' + (this.chess.turn() === 'w' ? 'white' : 'black');
      }
      if (this.chess.in_draw()) {
        result = 'In draw';
      }
      if (this.chess.in_stalemate()) {
        result = 'In stalemate';
      }
      if (this.chess.in_threefold_repetition()) {
        result = 'In threefold repetition';
      }

      return result;
    };
    board.newGame = function() {
      this.chess = new Chess();
      this.position('start');
    };

    return board;
  };

});