
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
let users = {};
let messages = [];
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/models'));
app.get('/userdata', (req, res) => {
  res.sendFile(__dirname + '/models/userdata.js');
});

app.get('/api/users', async (req, res) => {
try {
    const users = await User.find().select('-password');
    res.json(users);
} catch (error) {
    console.error(error);
    res.status(500).json({ message: 'fetching users failed! 😁Oweddeeeee'});
}
})

app.use(express.static(__dirname + '/mine'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});
app.use('/styles', express.static(__dirname + '/styles'));
app.post('/', (req, res) => {
  req.sendFile(__dirname + '/chat.html');
});


io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (username) => {
    users[socket.id] = username;
    socket.broadcast.emit('user joined', username);
    socket.emit('previous messages', messages);
  });

  socket.on('chat message', (message) => {
    messages.push({ username: users[socket.id], message });
    io.emit('chat message', { username: users[socket.id], message });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.broadcast.emit('user left', users[socket.id]);
    delete users[socket.id];
  });
});

server.listen(port, () => {
  console.log(`your server is listening at ${port}`);
});