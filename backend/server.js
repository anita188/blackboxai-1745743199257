const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/whatsapp_clone';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Define Mongoose schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Simple user registration endpoint
app.post('/register', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ error: 'Username already exists' });
    user = new User({ username });
    await user.save();
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (contacts)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username -_id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.IO for real-time messaging
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join', (username) => {
    socket.username = username;
    socket.join(username);
    console.log(`${username} joined their room`);
  });

  socket.on('send_message', async (data) => {
    const { sender, receiver, content } = data;
    const message = new Message({ sender, receiver, content });
    await message.save();

    // Emit message to receiver
    io.to(receiver).emit('receive_message', message);

    // Emit message status update to sender
    io.to(sender).emit('message_status', { messageId: message._id, status: 'sent' });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
