var config = require('../config.js');

exports.test_tor_factory = function(test){
  console.log('initiate a factory with 5 proxies')
  var TorFactory = require('../proxies/torfactory').init({
    circuit_count : 5,
    base_socks_port : 9050,
    base_control_port : 15000
  })
  .then((function(ready_factory) {
    console.log('factory ready, check proxies')
    test.equal(ready_factory.proxies.length, 5);
    console.log('ready proxies all there, try to make some more')
    ready_factory.makeMoreProxies(5)
    .then((function(){
      console.log('made some more, check to see theyre all there')
      test.equal(ready_factory.proxies.length, 10);
      var circ = ready_factory.getProxy();
      console.log('all there, grab a proxy and check its ports are right and active')
      test.equal(circ.socksPort >= 9050, true);
      test.equal(circ.controlPort >= 15000, true);
      test.equal(circ.active, true);
      console.log('checking done, close the proxies')
      ready_factory.closeProxies();
      console.log('closed proxies, confirm proxies list empty')
      // conso.e.log(circ.proxies.length);
      console.log('all inactive, testing complete')
      test.done();
    }).bind(test));
  }).bind(test));
}
