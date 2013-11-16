# [Chesscracy](chesscracy.herokuapp.com) - multiplayer chess game.
Fast Chess game for multiple players with a voting mechanism.
- - -

About
-----------------------------------

Free one-page web app that uses websockets to allow multiple players to play a chess game together. Each player votes for a next move and the server makes a decision based on majority choice. A player sees the votes of all players on a chessboard during a turn.

Game type - **fast chess** / **lighting** ([wiki](http://en.wikipedia.org/wiki/Fast_chess#Overview)) - with a fixed time (20 seconds) for each move.

Projects and technologies used
-----------------------------------

* [node.js](http://nodejs.org)
* [express.js](http://expressjs.com)
* [sockjs](http://github.com/sockjs) - sockjs-node and sockjs-client
* [require.js](http://requirejs.org)
* [chess.js](https://github.com/jhlywa/chess.js)
* [chessboardjs.js](http://chessboardjs.com)
* [jQuery](http://jquery.com)
* [Twitter Bootstrap](http://getbootstrap.com/2.3.2) 2
* Hosted on [Heroku](http://www.heroku.com)
* [chesspastebin](http://www.chesspastebin.com) service API used for saving games
* svg

Rules
-----------------------------------

* The game runs without stops, even if there are no players.
* The voting lasts 20 seconds.
* The voting can be stopped earlier if the amount of non-voted participants cannot affect on the result anymore.
* If there are no votes for the move then at the end of 20 seconds time period the server will choose one move from all possible ones randomly (most likely it would be the worse move).
* You can change your decision any moment and vote again.
* You can come to another side any moment.
* To surrender the game the "Surrender" button can be used.The action is taken if there are 75% of voters selected this option.
* At the end of the game there is a 30 seconds pause and then a new game starts!
* After the end of the game it can be saved and reviewed at [www.chesspastebin.com](http://www.chesspastebin.com) (please do not use it to save trash games)

License
-----------------------------------