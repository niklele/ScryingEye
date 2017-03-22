'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

app.use(express.static('public'))

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.MESSENGER_APP_SECRET

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

// for Facebook verification
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

const handleRoll = (match) => {
    // matches are: [full text, number of dice, number of sides on dice, constant]
    if (match.length < 3) {
        console.log("bad match")
        return 0
    }
    let n = (Number(match[1]) > 0) ? Number(match[1]) : 1
    let f = (Number(match[2]) > 0) ? Number(match[2]) : 1
    let res = 0
    for(let i = 0; i < n; i++){
        res += Math.floor(Math.random() * f) + 1
    }
    if (!isNaN(Number(match[3]))) {
        let c = Number(match[3])
        res += c
        console.log("Rolled n=" + n + " f=" + f + " c=" + c + " res=" + res)
    } else {
        console.log("Rolled n=" + n + " f=" + f + " res=" + res)
    }
    return res
}

var rollPattern = /roll (\d+)[Dd](\d+)\+?(\d+)?/i;
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            let match = rollPattern.exec(text)
            if (match != null) {
                let result = handleRoll(match)
                sendTextMessage(sender, "Rolled " + result)
            }
            // TODO look up monster and spell info
            // if (text === 'Generic') {
            //     sendGenericMessage(sender)
            //     continue
            // }
        }
        if (event.postback) {
            let text = JSON.stringify(event.postback)
            sendTextMessage(sender, "Postback received: "+ text.substring(0, 200))
            continue
        }
    }
    res.sendStatus(200)
})

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "https://scryingeye.herokuapp.com/crystal-ball.png",
                    "buttons": [ {
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }]
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

// Index route
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})