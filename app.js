var express = require('express');
var app = express();
var path = require('path');
var port = 8081;

var server = app.listen(port, function() {
    console.log('Listening on port: ' + port);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index');
});


var io = require('socket.io').listen(server);

// เมื่อมี client เข้ามาเชื่อมต่อให้ทำอะไร?
io.on('connection', function(socket) {
    // เมื่อได้รับข้อมูลจากท่อ "chat" ให้ทำอะไร?
    socket.on('chat', function(message) {
      // ส่งข้อความที่ได้ไปหาทุกๆ client ที่เชื่อมต่อกับท่อชื่อ "chat"
      io.emit('chat', message + ' @' + getTime());
    });
});



function getTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return hour + ":" + min + ":" + sec;

}
