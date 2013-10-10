define([
  'sockjs'
],function(sockjs) {

  return function(onmessage, onclose) {
    var sock = new sockjs('/game');

    sock.onopen = function() {
      console.log('open');
    };

    sock.onclose = function() {
      console.log('close');
      onclose();
    };

    sock.onmessage = function(d) {
      var msg = $.parseJSON(d.data);
      onmessage(msg);
    };

    return sock;
  };

});