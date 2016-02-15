var express = require('express');
var nodemailer = require('nodemailer');
var pgp = require('pg-promise')(/*options*/);
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Teknologföreningens årsfest' });
});


/* GET register form */
router.get('/register/', function(req, res, next) {
  res.render('register', { title: 'Anmälan' });
});


/* POST submit form */
router.post('/submit/', function(req, res, next) {
  console.log(req.body);
  var transporter = nodemailer.createTransport('smtp://smtp.ayy.fi');
  
  req.sanitizeBody('first_name').escape();
  req.checkBody('first_name', 'Felaktigt förnamn!').notEmpty();
  req.sanitizeBody('last_name').escape();
  req.checkBody('last_name', 'Felaktigt efternamn!').notEmpty();
  req.sanitizeBody('email').escape();
  req.checkBody('email', 'Felaktig e-postadress!').isEmail();
  req.sanitizeBody('organisation').escape();
  req.sanitizeBody('diet').escape();
  req.sanitizeBody('avec').escape();
  req.sanitizeBody('misc').escape();

  if (req.body.solenn_akt != "1") req.body.solenn_akt = "0";
  if (req.body.greeting != "1") req.body.greeting = "0";
  if (req.body.alcoholfree != "1") req.body.alcoholfree = "0";
  if (req.body.sillis != "1") req.body.sillis = "0";

  if (req.validationErrors()) {
    var err = new Error(req.validationErrors()[0].msg);
    res.status(400);
    res.render('error', { error: err });
  } else if (['free', 'student', 'normal', 'supporter'].indexOf(req.body.price) < 0) {
    var err = new Error("Du har inte valt priskategori!");
    res.status(400);
    res.render('error', { error: err });
  } else {
    var settings = require('../settings.js');
    var db = pgp("postgres://" + db_user + ":" + db_password + "@" + db_host + "/" + db_name);
    
    db.query("INSERT INTO Participants(first_name, last_name, organisation, greeting, email, diet, alcoholfree, sillis, solenn_akt, avec, misc, category) VALUES (${first_name}, ${last_name}, ${organisation}, ${greeting}, ${email}, ${diet}, ${alcoholfree}, ${sillis}, ${solenn_akt}, ${avec}, ${misc}, ${price})", req.body)
        .then(function() {
          console.log("Added to the database");
          
          var mailOptions = {
            from: 'TF144 <arsfest@teknolog.fi>',
            to: req.body.email,
            subject: 'Bekräftelse',
            text: 'Hej,\n\nDin anmälan till Teknologföreningens årsfest har mottagits. Vidare instruktioner angående betalning kommer att skickas senare.\n\nVälkommen med på festen!',
          };

          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              res.send(error);
            } else {
              console.log('Message sent: ' + info.response);
            }
          });
          
          // Informational message
          var infoMailOptions = {
            from: 'TF144 <arsfest@teknolog.fi>',
            to: 'oleg.stikhin@aalto.fi',
            subject: 'Ny anmälning',
            text: JSON.stringify(req.body),
          };

          transporter.sendMail(infoMailOptions, function(error, info) {
            if (error) {
              res.send(error);
            } else {
              console.log('Informational message sent: ' + info.response);
            }
          });
          
          res.render('submit', { title: 'Bekräftelse' });
        })
        
        .catch(function(error) {
          console.log("Database error: " + error);
          var err = new Error(error);
          res.status(500);
          res.render('error', { error: err });
        });
    
    
  }
});


/* GET the participants' list */
router.get('/list/', function(req, res, next) {
    var settings = require('../settings.js');
    var db = pgp("postgres://" + db_user + ":" + db_password + "@" + db_host + "/" + db_name);
    query = db.query("SELECT first_name, last_name, organisation FROM participants;")
      .then(function (data) {
        res.render('list', { title: 'Deltagare', data: data });
      })
      .catch(function (error) {
        console.log("Database error: " + error);
        var err = new Error(error);
        res.status(500);
        res.render('error', { error: err });
      });
});


module.exports = router;
