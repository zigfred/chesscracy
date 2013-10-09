requirejs.config({
  "baseUrl": "js/lib",
  "paths": {
    "app": "../app",
    "jquery": "jquery-2.0.3.min",
    "sockjs": [
      "//cdn.sockjs.org/sockjs-0.3.min",
      'sockjs-0.3.min'
    ],
    "ChessBoard": "chessboard-0.3.0",
    "bootstrap": "bootstrap",
    "Chess": "chess"
  },
  "shim": {
    "bootstrap": ["jquery"]
  }
});

// Load the main app module to start the app
requirejs(["app/main", 'ChessBoard', 'Chess']);