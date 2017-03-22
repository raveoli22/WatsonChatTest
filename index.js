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

var hasIntentAlready = false; 
var callYelpApi = false; 
var searchQuery = "";
var filter = "";


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
            var intentHolder = "";
            
            if (context == null){
                contexts.push({'from': idNum, 'context': res.context});
            } else {
                contexts[contextIndex].context = res.context;
            }
            //Intent classifying ----------------------------------------------
            var intent = res.intents[0].intent;
            if (intent == "done"){
                contexts.splice(contextIndex,1);
            }
            if (intent == "FindRestaurant"){
                intentHolder = "FindRestaurant";
                filter = "restaurants";
            }
            else if(intent == "FindBar"){
                intentHolder = "FindBar";
                filter = "bars";
            }
            else if (intent == "Find_Movie_Theatre"){
                intentHolder = "Find_Movie_Theatre";
                filter = "movietheaters";
            }
            
            //Chat logic -----------------------------------------------------
            //Chat logic -----------------------------------------------------

            if (intent == intentHolder && res.entities.length > 0){ //intent and entity for food = call api
                searchQuery = res.entities[0].value; 
                callYelpApi = true;  
                sendResponse(idNum,"Please enter a location: "); 
            }
            else if (res.entities.length > 0){                           //only entity, check if intent has been passed
                if(hasIntentAlready){
                    searchQuery = res.entities[0].value; 
                    callYelpApi = true;  
                    hasIntentAlready = false; 
                    sendResponse(idNum,"Please enter a location: "); 
                }
                else {
                    sendResponse(idNum,res.output.text[0]);
                }
            }
            else if (intent == intentHolder && res.entities.length < 1){ //initial intent but no entity 
                hasIntentAlready = true; 
                sendResponse(idNum,res.output.text[0]);
            }
            else {
                var location = "";
                if(callYelpApi) {  //we need to call yelp API
                    location = message; 
                    var temp = "Here are 5 HOT " + searchQuery + " spots near the location you have entered: ";
                    sendResponse(idNum,temp); 
                    searchYelp(searchQuery,idNum,filter,location);  //if entity if found then we use yelp api
                    callYelpApi = false; //after calling yelp api turn it false
                }
                else {
                    sendResponse(idNum,res.output.text[0]);        //call a normal response
                }
            }
        }
         //logic -----------------------------------------------------
         //logic -----------------------------------------------------
    }
)};

var businessArray = [];
var businessAddressArray = [];
//yelp search API call
function searchYelp (searchQuery,recipientID,filter,location){
    
    yelp.search( { term: searchQuery, location: location, limit: 5, category_filter: filter } )
	.then( function ( data ) {
        
        data.businesses.forEach(function(business){
            businessArray.push(business);
            businessAddressArray.push(generateBusinessString(business));
            //for each business in businesses, create a string and relay back to user
        });
        sendResponseList(recipientID,businessArray,businessAddressArray); 
	})
	.catch( function ( err ) {
		console.log( err);
        sendResponse(recipientID,"Woops, it seems like there was an issue with your address");
	});
    
};


function sendResponse(recipientID,messageText){
    
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs : {access_token: token},
        method: "POST",
        json: {
            recipient: {id: recipientID},
            message : {text: messageText} //sends text back to facebook chat 
        }
    }, function(error, response, body) {
        if (error) {
            console.log("sending error");
        } else if (response.body.error) {
            console.log("response body error but why...");
        }
    });
};

function sendResponseList(recipientID,businessArray,businessAddressArray){

    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs : {access_token: token},
        method: "POST",
        json: {
            recipient: {id: recipientID},
            message : { 
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "list",
                                top_element_style: "compact",
                                elements: [
                                  {
                                    title: businessAddressArray[1]
                                  }
                                ]    
                            }
                        }

        } //sends list of restaurants to user
      }
    }, function(error, response, body) {
        if (error) {
            console.log("sending error");
        } else if (response.body.error) {
            console.log("response body error LIST but why...");
        }
    });
    
};

function sendResponseButton(recipientID){
    
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs : {access_token: token},
        method: "POST",
        json: {
            recipient: {id: recipientID},
            message : { 
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "button",
                                text: "Was I helpful?",
                                buttons: [
                                  {
                                    type: "postback",
                                    title: "YES",
                                    payload: "DEVELOPER_DEFINED_PAYLOAD"
                                  },
                                  {
                                    type: "postback",
                                    title: "NO",
                                    payload: "DEVELOPER_DEFINED_PAYLOAD"  
                                  }
                                ]    
                            }
                        }

        } //sends button back to facebook chat for user feedback
      }
    }, function(error, response, body) {
        if (error) {
            console.log("sending error");
        } else if (response.body.error) {
            console.log("response body error BUTTON but why...");
        }
    });
    
};

function generateBusinessString(business) {
  var output = business.name + "\n\n";
  output += business.location.display_address.join(", ");
  return output;
};

app.listen(app.get('port'), function() {
	console.log("running: port");
});

