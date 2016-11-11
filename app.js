var express = require('express');
var app = express();
var path = require('path');
var port = 8081;
//s,c,d,h
var deck = ["ace_of_spades2.png","2_of_spades.png","3_of_spades.png","4_of_spades.png","5_of_spades.png","6_of_spades.png","7_of_spades.png","8_of_spades.png","9_of_spades.png","10_of_spades.png","jack_of_spades2.png","queen_of_spades2.png","king_of_spades2.png"
           ,"ace_of_hearts.png","2_of_hearts.png","3_of_hearts.png","4_of_hearts.png","5_of_hearts.png","6_of_hearts.png","7_of_hearts.png","8_of_hearts.png","9_of_hearts.png","10_of_hearts.png","jack_of_hearts2.png","queen_of_hearts2.png","king_of_hearts2.png"
           ,"ace_of_diamonds.png","2_of_diamonds.png","3_of_diamonds.png","4_of_diamonds.png","5_of_diamonds.png","6_of_diamonds.png","7_of_diamonds.png","8_of_diamonds.png","9_of_diamonds.png","10_of_diamonds.png","jack_of_diamonds2.png","queen_of_diamonds2.png","king_of_diamonds2.png"
           ,"ace_of_clubs.png","2_of_clubs.png","3_of_clubs.png","4_of_clubs.png","5_of_clubs.png","6_of_clubs.png","7_of_clubs.png","8_of_clubs.png","9_of_clubs.png","10_of_clubs.png","jack_of_clubs2.png","queen_of_clubs2.png","king_of_clubs2.png"];

var count = 0;

var server = app.listen(port, function() {
    console.log('Listening on port: ' + port);
});
var io = require('socket.io').listen(server);


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index');
});

io.on('connection', function(socket) {

    // เมื่อได้รับข้อมูลจากท่อ "chat" ให้ทำอะไร?
    socket.on('command', function(data) {
      // ส่งข้อความที่ได้ไปหาทุกๆ client ที่เชื่อมต่อกับท่อชื่อ "chat"
      console.log('income message: ' + data.message);
      if(count >= 51 || data.message == 'shuffle'){
          if(count >= 51){
              data.message = 'ไพ่หมดสำรับ';
          }
          else{
              data.message = 'สับไพ่';
          }
          io.emit('chat', data);
          io.emit('shuffle', data);
          shuffle(deck);
          count = 0;
      }else if(data.message == 'pok'){
          data.message = 'ได้รับไพ่';
          io.emit('chat', data);
          data.message = [deck[count++],deck[count++]];
          socket.emit('cards', data);
      }else if(data.message == 'hit'){
          data.message = 'เรียกไพ่';
          io.emit('chat', data);
          data.message = deck[count++];
          socket.emit('card3', data);
      }else{
          io.emit('chat', data);
      }
    });

    socket.on('chat', function(data) {
      // ส่งข้อความที่ได้ไปหาทุกๆ client ที่เชื่อมต่อกับท่อชื่อ "chat"
      console.log('income message: ' + data.message);
      io.emit('chat', data);
    });
});

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}
