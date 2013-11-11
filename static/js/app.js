requirejs.config({
  "baseUrl": "/js",
  "paths": {
    "jquery": "lib/jquery-2.0.3",
    "sockjs": 'lib/sockjs-0.3.min',
    "ChessBoard": "lib/chessboard-0.3.0",
    "bootstrap": "lib/bootstrap",
    "Chess": "lib/chess"
  },
  "shim": {
    "bootstrap": ["jquery"]
  }
});

// Load the main app module to start the app
requirejs(["app/main", 'ChessBoard', 'Chess']);