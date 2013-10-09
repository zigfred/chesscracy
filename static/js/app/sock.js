define([
  'sockjs'
],function(sockjs) {

  return function(onmessage) {
    var sock = new sockjs('/game');

    sock.onopen = function() {
      console.log('open');
    };

    sock.onclose = function() {
      console.log('close');
    };

    sock.onmessage = function(d) {
      var msg = $.parseJSON(d.data);
      onmessage(msg);
    };

    return sock;
  };

});