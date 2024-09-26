const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({ extended : false}));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

//Define shema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema)

// POST to create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  newUser.save((err, savedUser) => {
    if (err) return res.status(500).json({ error: 'Could not save user' });
    res.json({ username: savedUser.username, _id: savedUser._id });
  });
});

// GET to retrieve all users
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).json({ error: 'Could not retrieve users' });
    res.json(users);
  });
});

// POST to add exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  User.findById(_id, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    newExercise.save((err, savedExercise) => {
      if (err) return res.status(500).json({ error: 'Could not save exercise' });

      res.json({
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
        _id: user._id
      });
    });
  });
});

// GET to retrieve the exercise log for a user
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  User.findById(_id, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    Exercise.find(query).limit(parseInt(limit) || 0).exec((err, exercises) => {
      if (err) return res.status(500).json({ error: 'Could not retrieve exercises' });

      const log = exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      }));

      res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log
      });
    });
  });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
