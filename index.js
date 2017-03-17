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
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = process.env.MESSENGER_APP_SECRET

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = process.env.SERVER_URL

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
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

const rollDice = (dice) => {
    for (var i = 0; i < dice.length; i++){
        if(isNaN(Number(dice[i])) && dice[i] != 'd'){
            dice = e.slice(i+1)
        }
    }

    var values = dice.split('d')
    values[0] = Number(values[0]) > 0 ? Number(values[0]) : 1
    var res = '( '
    for(var i = 0; i < values[0]; i++){
        res += Math.floor(Math.random() * values[1])+1
        if (i < values[0] - 1) res += ' + '
    }
    res += ' )'
    return {roll: dice, result: res}
}

const handleRoll = (text) => {
    // console.log(msg.body)
    // let msgBody = msg.body
    // let thread  = msg.threadID

    var body = ''
    if(text.indexOf('help') >= 0) {
        return 'with roll any mathematical operation will be executed and combinations of {n}d{faces} will roll a die with {faces} faces {n} times, for example: roll 2*3d6+2'
    }

    let roll = text.split(' ')[1]
    let rolls = []

    for (var i = 0; i < roll.length; i++){
        if(roll[i] == 'd'){
            var tmp = roll.slice(i-1);
            var j;
            for(j = 0; j < tmp.length; j++){
                if(isNaN(Number(tmp[j]))) break
            }
            rolls.push(roll.slice(i-1, i+j+1))
        }
    }

    var rollsResults = []

    rolls.forEach((e, idx) => {
        rollsResults[idx] = rollDice(e)
    })

    rollsResults.forEach((e, idx) => {
        roll = roll.replace(e.roll, e.result)
    })

    body = roll + ' = ' + eval(roll)

    console.log(body)
    return body
}

var rollPattern = /roll/i;
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            if (rollPattern.test(text)) {
                sendTextMessage(sender, "Rolled " + handleRoll(text))
            }
            if (text === 'Generic') {
                sendGenericMessage(sender)
                continue
            }
            // sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
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
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})