define([
  'sockjs'
],function(sockjs) {

  return function(onmessage, onclose) {
    var sock = new sockjs('/game');

    sock.onopen = function() {
    };

    sock.onclose = function() {
      onclose();
    };

    sock.onmessage = function(d) {
      var msg = $.parseJSON(d.data);
      onmessage(msg);
    };

    return sock;
  };

});