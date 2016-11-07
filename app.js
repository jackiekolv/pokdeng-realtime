var express = require('express');
var app = express();
var path = require('path');
var port = 8081;
//s,c,d,h
var deck = ["1s","2s","3s","4s","5s","6s","7s","8s","9s","10s","Js","Qs","Ks"
           ,"1h","2h","3h","4h","5h","6h","7h","8h","9h","10h","Jh","Qh","Kh"
           ,"1d","2d","3d","4d","5d","6d","7d","8d","9d","10d","Jd","Qd","Kd"
           ,"1c","2c","3c","4c","5c","6c","7c","8c","9c","10c","Jc","Qc","Kc"];

var count = 0;

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
    socket.on('command', function(message) {
      // ส่งข้อความที่ได้ไปหาทุกๆ client ที่เชื่อมต่อกับท่อชื่อ "chat"
      // io.emit('chat', message + ' @' + getTime());
      console.log('income message: ' + message);
      if(count >= 51 || message == 'shuffle'){
          shuffle(deck);
          count = 0;
      }
      if(message == 'pok'){
          socket.emit('command', '['+deck[count++]+']' + '['+deck[count++]+']' + ' @' + getTime());
      }
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

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}
