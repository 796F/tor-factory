//this file handles requests sent through tor, as well as controlling tor using their signal protocol
var shttps = require('socks5-https-client');
var shttp = require('socks5-http-client');
var spawn = require('child_process').spawn;
var net = require('net');
var fs = require('fs');
var Q = require('q');

var TOR_AUTH_SIGNAL = 'AUTHENTICATE\n';
var TOR_RANDOM_IP_SIGNAL = 'SIGNAL NEWNYM\r\n';
var TOR_TERMINATE_SIGNAL = 'SIGNAL TERM\r\n';
var TOR_GETIP_SIGNAL = 'GETINFO address\n';

Tor = function(socksPort, controlPort){
  //EACH tor circuit needs its own data directory.
  try{
    fs.mkdirSync('data/tor' + controlPort);
  } catch (error) { /*ignore EEXIST */ }

  this.active = false;
  //assign this tor objects fields.
  this.socksPort = socksPort;
  this.controlPort = controlPort;
  this.circuit = spawn('tor', [
    '--RunAsDaemon', 1,
    '--CookieAuthentication', 0,
    '--ControlPort', controlPort,
    '--SocksPort', socksPort,
    '--DataDirectory', 'data/tor' + controlPort,
    '--PidFile', 'tor' + controlPort + '.pid'
    ], {
      uid: process.getuid(),
      gid: process.getgid(),
      detached: true
    });

  this.socket = new net.Socket();
}

Tor.prototype.init = function() {
  return Q.Promise((function(resolve, reject, notify){
    this.active = false;
    this.circuit.stdout.on('data', (function (data) {
      if (_controlListening(data)){
        console.log('Connect to Tor control via socket ', this.controlPort);

        this.socket.connect(this.controlPort);
        this.socket.on('connect', (function(test){
          //upon connecting to Tor via the socket,
          //send Tor the auth signal, and declare this circuit active.
          this.socket.write(TOR_AUTH_SIGNAL);
          if(!this.active){
            console.log('socket connected, active the circuit')
            this.active = true;
            resolve(this);
          }
        }).bind(this));

        this.socket.on('error', function(error) {
          console.log('socket error', error);
          reject(error);
        });
      }
    }).bind(this));

    this.circuit.stderr.on('data', function (data) {
      reject(error);
    });

    this.circuit.on('close', function (code) {
      if(code == 0){
        //running just fine
      }else{
        console.log('circuit already exists!! ', code);
      }
    });
  }).bind(this));
}

Tor.prototype.terminate = function() {
  this.socket.write(TOR_TERMINATE_SIGNAL);
  this.active=false;
}

Tor.prototype.changeIp = function() {
  this.socket.write(TOR_RANDOM_IP_SIGNAL);
}

//expects a callback with function(error, result)
//low level request call, lets you work with chunk data.
Tor.prototype.request = function (options, callback){
  var agent = options.protocol === 'https:' ? shttps : shttp;
  options.socksPort = this.socksPort;
  //required for node issue, https://github.com/joyent/node/issues/5360
  options.secureOptions = require('constants').SSL_OP_NO_TLSv1_2

  console.log('CIRCUIT.REQUEST options, ', options);

  return agent.get(options, callback);
}

//get is basically requests but it handles the chunking and parsing and socksport adjusting for you!
//mostly use this one, has the try block too.
Tor.prototype.get = function (options) {
  return Q.Promise(function(resolve, reject, notify) {
    var agent = options.protocol === 'https:' ? shttps : shttp;
    options.socksPort = this.socksPort;
    //required for node issue, https://github.com/joyent/node/issues/5360
    options.secureOptions = require('constants').SSL_OP_NO_TLSv1_2

    console.log('CIRCUIT.GET options, ', options);

    try{
      var request = agent.get(options, (function(response){
        console.log(response);
        var status = response.statusCode;
        var limit = response.headers['x-ratelimit-limit'];
        var remaining = response.headers['x-ratelimit-remaining'];

        if(remaining < 2){
          console.log('limit remaining:', remaining, 'calling ', this.changeIp.toString());
          this.changeIp();
        }

        var start = Date.now();
        var data = '';
        response.on('data', function (chunk) {
          // console.log(chunk);
          data += chunk;
        });
        response.on('end', function() {
          console.log('request on port', options.socksPort, 'TOOK', Date.now() - start, 'ms to complete');
          resolve(JSON.parse(data));
        });
      }).bind(this));

      request.on('error', function(error) {
        reject(error);
      });
    }catch(err){
        console.log(err);
      console.log('error in TOR GET');
      reject(err);
    }
  }.bind(this));
}

function _controlListening (circuitOutput) {
  return circuitOutput.toString().indexOf('Opening Control listener on') >= 0 ? true : false;
}

module.exports = Tor;
