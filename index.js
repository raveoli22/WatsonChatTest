'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
var ConversationV1 = require('watson-developer-cloud/conversation/v1');

//yelp API
var Yelp = require('yelp');

var yelp = new Yelp({
  consumer_key: '0x96I5XkMZc0ZcgmeqCi8A',
  consumer_secret: 'oMCBzbBLP4jsEQVITF3WrazR3cE',
  token: 'Po7DdpBSKYpTDjt8T4qHKWiuyTZCDWn1',
  token_secret: '9CNHpflcmCZDx2i0py6UGA2J0H8',
});
//yelp API

const app = express();
var contexts = []; //keeps track of contexts

var entities = []; //keeps track of entities 
var entityIndex = 0;

var businessNames = []; 

app.set('port', (process.env.PORT || 5000));

// Allows us to process the data
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// ROUTES

app.get('/', function(req, res) {
	res.send("sending...");
});

let token = "EAACvXXrZATJsBAFEZCja5biIB0HWNknVGB1IDkquCrcTZBzBjUCDiZBh2gr9ce3r5wU5kY9AmWj2Tkhx9hDK9uVvsboIqTgZCc55aE9uxgcx3Lo9MWkIw4Ru2s3mjZCdgGOs9wmwL6yvZClLTQ346GDStKdFt87kqG74hGI5CAgsAZDZD";


var destString = ""; //string to be added to message


// Facebook 

app.get('/webhook/', function(req, res) {
	if (req.query['hub.verify_token'] === "blondiebytes") {
		res.send(req.query['hub.challenge']);
	}
	res.send("Wrong token");
});

app.post('/webhook/', function(req, res) {
    console.log(req.body);
	let messaging_events = req.body.entry[0].messaging;
	for (let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i];
		let sender = event.sender.id;
		if (event.message && event.message.text) {
			let text = event.message.text;
            getWatson(sender,text);
		}
	}
	res.sendStatus(200);
});

function getWatson(idNum,message){
    //var idNum = event.sender.id;
    //var message = event.message.text;
    
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
                contexts[contextIndex].context = res.context;
            }
            
            var intent = res.intents[0].intent;
            if (intent == "done"){
                contexts.splice(contextIndex,1);
            }
            
            //entities -----------------------------------------------------
            if (res.entities.length > 0){ //there are entities from user
                
                var searchQuery = "";
                var location = "";
                var filter = "";
                
                if(res.entities[0].entity == "cuisine"){
                    searchQuery = res.entities[0].value; 
                    filter = "restaurants";
                    sendResponse(idNum,"Please enter a location: "); 
                    if (!location){         //if location is empty
                        location = message; 
                    }
                    else {
                        sendResponse(idNum,location); 
                    }
                }
                else {
                    searchYelp(searchQuery,idNum,filter,location);  //if entity if found then we use yelp api
                }
            }
            // ---------------------------------------------------------------
            
            else {
                sendResponse(idNum,res.output.text[0]);        //else just call a normal response
            }
        }
    });
    
};

//yelp search API call
function searchYelp (searchQuery,recipientID,filter,location){
    
    yelp.search( { term: searchQuery, location: location, limit: 5, category_filter: filter } )
	.then( function ( data ) {
        data.businesses.forEach(function(business,index){
            sendResponse(recipientID,generateBusinessString(business, index)); 
            //for each business in businesses, create a string and relay back to user
        });
	})
	.catch( function ( err ) {
		console.log( err);
	});
    
};


function sendResponse(recipientID,messageText){
    
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs : {access_token: token},
        method: "POST",
        json: {
            recipient: {id: recipientID},
            message : {text: messageText} //sends IBM conversation's chat back
        }
    }, function(error, response, body) {
        if (error) {
            console.log("sending error");
        } else if (response.body.error) {
            console.log("response body error but why...");
        }
    });
};

function generateBusinessString(business, index) {
  var output = business.name + "\n\n";
  output += business.location.display_address.join(", ");
  return output;
};

app.listen(app.get('port'), function() {
	console.log("running: port");
});

