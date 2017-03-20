'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
var ConversationV1 = require('watson-developer-cloud/conversation/v1');

const app = express();
var contexts = [];

app.set('port', (process.env.PORT || 5000));

// Allows us to process the data
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// ROUTES

app.get('/', function(req, res) {
	res.send("sending...");
});

let token = "EAACvXXrZATJsBAFEZCja5biIB0HWNknVGB1IDkquCrcTZBzBjUCDiZBh2gr9ce3r5wU5kY9AmWj2Tkhx9hDK9uVvsboIqTgZCc55aE9uxgcx3Lo9MWkIw4Ru2s3mjZCdgGOs9wmwL6yvZClLTQ346GDStKdFt87kqG74hGI5CAgsAZDZD";

// Facebook 

app.get('/webhook/', function(req, res) {
	if (req.query['hub.verify_token'] === "blondiebytes") {
		res.send(req.query['hub.challenge']);
	}
	res.send("Wrong token");
});

app.post('/webhook/', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          getWatson(event);
        }
      });
    });
    res.status(200).end();
  }
});

function getWatson(event){
    var idNum = event.sender.id;
    var message = event.message.text;
    
    var context = null;
    var index = 0; 
    var contextIndex = 0;
    contexts.forEach(function(value){
        if (value.from == idNum){
            context = value.content;
            contextIndex = index; 
        }
        index++;
    });
    
    var conversation = new ConversationV1({
        username: '8c73119f-a332-4909-87e5-891f04484991',
        password: 'xIoBgZDHNfoA',
        version_date: ConversationV1.VERSION_DATE_2016_09_20
    });
    
    conversation.message({
        input: {text: message},
        workspace_id: '344b3c17-2212-4183-9317-1d453c2ecbae',
        context: context
    }, function(err,res){
        if (err){
            console.error(err);
        } else {
            console.log(res.output.text[0]);
            if (context == null){
                contexts.push({'from': idNum, 'context': res.context});
            } else {
                contexts[contextIndex].context = response.context;
            }
            
            var intent = response.intents[0].intent;
            if (intent == "done"){
                contexts.splice(contextIndex,1);
            }
            
            request({
                url: "https://graph.facebook.com/v2.6/me/messages",
                qs : {access_token: token},
                method: "POST",
                json: {
                    recipient: {id: idNum},
                    message : {text: res.output.text[0]}
                }
            }, function(error, response, body) {
                if (error) {
                    console.log("sending error");
                } else if (response.body.error) {
                    console.log("response body error");
                }
            });
            
        }
    });
    
};

app.listen(app.get('port'), function() {
	console.log("running: port");
});

