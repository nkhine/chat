var fs = require("fs");
var node_static = require('node-static');
var nowjs = require("now");
var mongodb = require("mongodb");
var node_static_file = new(node_static.Server)('./public');

var groups = {};
var users = {};
var parsedUsers = [];

var server = require('http').createServer(function(req, res) {
  // static file server 
  req.addListener('end', function() {
    node_static_file.serve(req, res);
  });
});

var everyone = nowjs.initialize(server);

var mongoCollection;

var mongo;
if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  mongo = env['mongodb-1.8'][0]['credentials'];
} else {
  mongo = {
    "hostname": "localhost",
    "port": 27017,
    "username": "",
    "password": "",
    "name": "",
    "db": "db"
  };
};

var db = new mongodb.Db('chat', new mongodb.Server(mongo.hostname, mongo.port, {
  auto_reconnect: true
}));
db.open(function(err, _db) {
  if (err) {
    console.log(err);
    process.exit();
  }
  db.collection('conversations', function(err, collection) {
    if (err) {
      console.log(err);
      process.exit();
    }
    mongoCollection = collection;
    server.listen(process.env.VCAP_APP_PORT || 80);
  });
});


everyone.now.logStuff = function(message) {
  var messagetime = (new Date()).getTime();
  console.log(message);
};


function dummyReturn(timeStamp, user, cb) {
  cb(null, {
    user: user,
    data: 'dummy message\n'
  });
}

everyone.now.announce = function() {
  var self = this;
  var name;
  if (name = self.now.name) {
    if (users[name]) {
      users[name].online = true;
    } else {
      users[name] = {
        clientId: self.user.clientId,
        online: true,
        groups: [],
        activeGroup: -1
      };
    }
  } else {
    console.log('No name provided');
  }
  console.log('push name everywhere');
  parsedUsers.push(name);
  everyone.now.pushUser(name);
  console.dir(users);
}

everyone.now.makeTempGroup = function(_users) {
  var self = this,
      name = self.now.name,
      group;

  if (_users && _users.length) {
    group = nowjs.getGroup(name + '_' + new Date().getTime());
    for (u in _users) {
      if (name !== _users[u]) {
        group.addUser(users[_users[u]].clientId);
      }
    }
    group.addUser(users[name].clientId); /* add self if not present already */
    group.plainNames = _users;
    for (u in _users) {
      if (name !== _users[u]) {
        users[_users[u]].groups.unshift(group);
        users[_users[u]].activeGroup = 0;
      }
    }
    users[name].activeGroup = 0;
    users[name].groups.unshift(group);
    group = null;
  }
};

function bye() {
  var self = this;
  var name = self.now.name;
  if (users[name]) {
    users[name].online = false;
  }
  console.log('Bye bye ', self.now.name);
};

everyone.on('leave', bye); /* keep only higher level event */


everyone.now.distributeMessage = function(message) {
  var self = this;
  var destination = everyone;
  var u = users[self.now.name];
  if (u.activeGroup !== -1) {
    destination = u.groups[u.activeGroup];
  }
  destination.now.receiveMessage(self.now.name, message);
  destination.getUsers(function(users) {
    mongoCollection.insert({
      source: self.now.name,
      destination: users.plainNames,
      timeStamp: new Date().getTime(),
      message: message
    }, function(err) {});
  });
  destination = null;
  u = null;
};

everyone.now.getAllUsers = function() {
  everyone.now.setAllUsers(parsedUsers);
};

everyone.now.nextChunk = function(cursor) {
  var self = this;
  dummyReturn(cursor, this.now.name, function(err, chunk) {
    self.now.appendContent(chunk.data);
  });
};
