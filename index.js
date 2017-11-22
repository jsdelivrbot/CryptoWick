const express = require('express');
const app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/client/build'));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

/*
var nodemailer = require("nodemailer");
var bodyParser = require("body-parser");

app.use(bodyParser.json());

app.post('/signup', function(request, response) {
  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_ADDRESS,
      clientId: process.env.EMAIL_OAUTH2_CLIENT_ID,
      clientSecret: process.env.EMAIL_OAUTH2_CLIENT_SECRET,
      refreshToken: process.env.EMAIL_OAUTH2_REFRESH_TOKEN
    }
  });

  // setup email data with unicode symbols
  let mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: process.env.EMAIL_ADDRESS,
      subject: 'CryptoWick Email Sign Up',
      text: request.body.emailAddress + " has signed up for CryptoWick."
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);
  });
  
  response.sendStatus(200);
});
*/