const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

let uri = 'mongodb+srv://Teekay:' + process.env.PW + '@cluster0.nlm1d.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });




app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

let exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
  count: Number,
})

let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
})

const Exercise = mongoose.model('Exercise', exerciseSchema)
const User = mongoose.model('User', userSchema)


app.route('/api/users')
  .post(bodyParser.urlencoded({ extended: false }), (req, res,) => {
    let newUser = new User({ username: req.body.username })
    newUser.save((error, savedUser) => {
      if (!error) {
        let resObject = {}
        resObject['username'] = savedUser.username
        resObject['_id'] = savedUser.id
        res.send(`Hello <i>${savedUser.username}</i>, Your ID is <strong>${savedUser.id}.</strong> </br> Remember to use this ID to add exercises and view your logs`)
      }
    })
  })
  .get((req, res) => {
    User.find({}, function (err, users) {
      var userMap = [];

      users.forEach(function (user) {
        userMap.push({
          "_id": user.id,
          "username": user.username
        })
      });
      res.json(userMap);
    })
  })

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {
  // console.log(req.body)

  let newExercise = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString()
  })

  if (newExercise.date === '') {
    newExercise.date = new Date().toISOString().substring(0, 10)
  }

  User.findByIdAndUpdate(
    req.params._id,
    { $push: { log: newExercise } },
    { new: true },
    (error, updatedUser) => {
      if (!error) {
        let responseObject = {}
        responseObject['_id'] = updatedUser._id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newExercise.date).toDateString()
        responseObject['description'] = newExercise.description
        responseObject['duration'] = newExercise.duration
        res.send(responseObject)
      }
    })
})

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.query._id
  const logFrom = req.query.from;
  const logTo = req.query.to;
  const logLimit = req.query.limit;

  User.findById({ _id: userId }, (err, user) => {
    // if (err) return console.log(`Record Not Found`)
    if (err) return res.send(`Record Not Found`)

    let log = user.log.map((item) => {
      return {
        description: item.description,
        duration: item.duration,
        date: new Date(item.date).toDateString()
      }
    })
    if (logFrom) {
      const fromDate = new Date(logFrom)
      log = log.filter(exe => new Date(exe.date) >= fromDate)
    }
    if (logTo) {
      const toDate = new Date(logTo)
      log = log.filter(exe => new Date(exe.date) <= toDate)
    }
    if (logLimit) {
      log = log.slice(0, logLimit)
    }

    let count = log.length

    res.send({
      "username": user.username,
      "count": count,
      "_id": userId,
      "log": log
    })
  })
})