var requirejs = require("requirejs");

var config = {
  appDir: "./static",
  baseUrl: "js",
  mainConfigFile: 'static/js/app.js',
  dir: "./static-build",
  name: 'app',
  removeCombined: true
};
requirejs.optimize( config, function(results) {
  console.log(results);
});