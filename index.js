var fs = require( 'fs' );

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


everyone.now.distributeMessage = function( message ) {
	var self = this;
	//console.log( message );
	
		
	everyone.now.receiveMessage(self.now.name, message);
};
server.listen( 8080 );

