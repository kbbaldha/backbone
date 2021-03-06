var express = require('express');
var session = require('express-session');
var router = express.Router();
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');

var bodyParser = require('body-parser');
var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = app.listen(3030);
var io = require('socket.io').listen(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(['/sendFriendRequest','/friendRequestAccepted'], function (req, res, next) {
    req.io = io;
    next();
});
app.use('/', routes);
app.use('/users', users);


io.sockets.on('connection', function (socket) {

    
    console.log('logged'+socket.handshake.query.loggeduser);
    routes.addSocketInfoToDatabase(socket.handshake.query.loggeduser, socket.id, io);
    io.sockets.emit("user_online", { user_id: socket.handshake.query.loggeduser });
    socket.on('message_to_server', function (data) {
        routes.sendMessage(data, io);
    });
    socket.on('disconnect', function (data) {
        //console.log('somebody is disconnected' + this);
        routes.disconnectUser(this,io);
    });
    
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
