/*
  this module starts up numerous tor proxies,
  makes sure they are all working,
  and 
*/

TorFactory = {
  proxies : []
}

var Tor = require('./tor.js');
var Q = require('q');

TorFactory.init = function(options){
  //spawn numerous isntances, save their pid, socks port, and control port information.
  TorFactory.next_socks_port = options.base_socks_port;
  TorFactory.next_control_port = options.base_control_port;
  return TorFactory.makeMoreProxies(options.circuit_count)
  .then(function(){
    //when the circuits are ready, return reference to the factory.  
    return TorFactory;
  });
}

TorFactory.closeProxies = function () {
  while(TorFactory.proxies.length > 0){
    var circuit = TorFactory.proxies.pop();
    console.log('closing circuit on ', circuit.controlPort);
    circuit.terminate();
  }
}

TorFactory.getProxy = function () {
  var min = 0;
  var max = TorFactory.proxies.length - 1;
  var randomIndex = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log('returned circuit number ', randomIndex, 'on port,', TorFactory.proxies[randomIndex].controlPort);
  return TorFactory.proxies[randomIndex];
}

TorFactory.makeMoreProxies = function (n) {
  //spawn n more proxies 
  var promises = [];
  for(var i=0; i<n; i++){
    //create a new circuit using the next valid port numbers
    var newCircuit = new Tor(TorFactory.next_socks_port, TorFactory.next_control_port);
    promises.push(newCircuit.init());
    //update these numbers for future uses.  
    TorFactory.next_socks_port++;
    TorFactory.next_control_port++;
  }
  return Q.all(promises)
  .then(function(circuits) {
    //once proxies finish initializing, add them to the proxies list.  
    TorFactory.proxies.push.apply(TorFactory.proxies, circuits);
  });
}

module.exports = TorFactory;
