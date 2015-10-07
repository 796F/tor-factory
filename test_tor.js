//contains tests for tor and tor factory

exports.test_tor = function(test){
  console.log('create new tor circuit')
  var tor = require('./tor.js');
  var circ = new tor(9500, 15000);
  console.log('checking ports set correctly')
  test.equal(circ.socksPort, 9500);
  test.equal(circ.controlPort, 15000);
  console.log('activating the circuit')
  circ.init().then((function(circuit){
    test.equal(circ.active, true);
    console.log('circuit properly activated, perform basic get')
    circ.get({
      protocol: 'http:',
      hostname: 'www.example.com',
      port: 443,
      headers: {'user-agent': 'node.js'},
      path: '/'
    }).then((function(res){
      console.log('get returnned, check validity of response')
      test.equal(res.length, 30);
      console.log('response is good, terminate the circuit')
      circ.terminate();
      test.equal(circ.active, false);
      console.log('circuit properly terminated')
      console.log('testing complete')
      test.done();
    }).bind(test));
  }.bind(test)));
}
