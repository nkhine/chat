var fs = require( 'fs' );

var groups = {};
var users = {};
var parsedUsers = [];

var server = require( 'http' ).createServer( function( req,res ) {
	var url;
	if ( req.url === '/'  ) {
		url = '/index.html';
	} else { 
		url = req.url;
	}
	console.log( url );
	var servedFile = '';
	try {
		servedFile = fs.readFileSync( __dirname  + '/node_modules/public' + url ) ;
	} catch ( err ) { 
		console.log( err.message );
	}
	res.end( servedFile );
});

var nowjs = require("now");
var	everyone = nowjs.initialize(server);

var redis = require( "redis" );
var redisClient = redis.createClient();
var redisUsers = {};


everyone.now.logStuff = function(message){
	var messagetime = (new Date()).getTime();
	console.log( message );
};

/*
function getUserCount( user, callback ) {
	var uKey = user + '_count';
	redisClient.get( uKey, function( err, reply ) {
		if ( err || !reply ) {
			redisClient.set( uKey, 0 );
			callback( null, 0 );
		} else {
			redisClient.incr( uKey );
			callback( null, reply );
		}
	} );
}

*/

function dummyReturn( timeStamp, user, cb ) {
	cb( null,  { user: user, data: 'dummy message\n' } );
}

everyone.now.announce = function( ) {
	var self = this;
	var name;
	if ( name = self.now.name ) {
		if ( users[ name ] ) {
			users[ name ].online = true;
		} else {
			users[ name ] = {
				nowID: self.user.clientId,
				online: true,
				groups: []
			};
		}
	} else { 
		console.log( 'No name provided' );
	}
	console.log( 'push name everywhere' );
	parsedUsers.push(name);
	everyone.now.pushUser(name);
	console.dir( users );
}

function bye( ) {
	var self = this;
	var name = self.now.name;
	if ( users[ name ] ) {
		users[ name ].online = false;
	}
	console.log( 'Bye bye ', self.now.name );
};

/* nowjs.on( 'disconnect', bye ); */
everyone.on( 'leave', bye ); /* keep only higher level event */


everyone.now.distributeMessage = function( message ) {
	var self = this;
	everyone.now.receiveMessage(self.now.name, message);
};

everyone.now.getAllUsers = function( ) {
	console.log( 'set all ' );
	everyone.now.setAllUsers( parsedUsers );
};

everyone.now.nextChunk = function( cursor ) {
	var self = this;
	dummyReturn( cursor, this.now.name , function( err, chunk ) {
		self.now.appendContent( chunk.data );
	});
};

server.listen( 8080 );
