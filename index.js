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


//YELP API GLOBALS
var hasIntentAlready = false; 
var callYelpApi = false; 
var searchQuery = "";
var filter = "";
var offset = 0;
var location = "";

//MATH GLOBALS
var doMath = false;
var numbs = [];
var signs = [];
var sum = 200; 

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
		} else if (event.postback && event.postback.payload){
            let payload = event.postback.payload; 
            if (payload == "view more items"){
                callYelpApi = true; 
                offset = offset + 4;
                sendResponse(sender,"Okay, 4 more coming right up near: \"" + location + "\"");
                searchYelp(searchQuery,sender,filter,location,offset);
            }
            else {
                getAddressOnly(sender,payload);
            }
            
        }
	}
	res.sendStatus(200);
});



//watson

function getWatson(idNum,message){
    
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
                location = "";
                offset = 0; 
                intentHolder = "FindRestaurant";
                filter = "restaurants";
            }
            else if(intent == "FindBar"){
                location = "";
                offset = 0; 
                intentHolder = "FindBar";
                filter = "bars";
            }
            else if (intent == "Find_Movie_Theatre"){
                location = "";
                offset = 0; 
                intentHolder = "Find_Movie_Theatre";
                filter = "movietheaters";
            }
            else if (intent == "Math"){
                doMath = true; 
            }
            
            //YELP Chat logic -----------------------------------------------------
            //YELP Chat logic -----------------------------------------------------

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
                else if (doMath){
                    doMath = false; 
                    
                    for (var i = 0; i < res.entities.length; i++){
                        if (res.entities[i] == "Math_symbols"){
                            signs.push(res.entities[i].value);
                        }
                        else {
                            numbs.push(res.entities[i].value);
                        }
                    }
                    Math_is_fun(signs,numbs);
                    sendResponse(idNum,sum.toString());
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
                
                if(callYelpApi) {  //we need to call yelp API
                    if (location == ""){ //if location is empty
                        location = message; 
                    }
                    var temp = "Here are 4 HOT \" " + searchQuery + " \" spots near: \" " + location + " \"";
                    sendResponse(idNum,temp); 
                    searchYelp(searchQuery,idNum,filter,location,offset);  //if entity if found then we use yelp api
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


//yelp search call for address only 
function getAddressOnly (recipientID,address){
    //var temp = yelp.business.businessID.location.address1; 
    sendResponse(recipientID,address);
};

//yelp search API call for main purposes
function searchYelp (searchQuery,recipientID,filter,location,offset){
    var businessArray = [];
    var businessAddressArray = [];
    yelp.search( { term: searchQuery, location: location, limit: 4, category_filter: filter, offset: offset } )
	.then( function ( data ) {
        
        data.businesses.forEach(function(business){
            businessArray.push(business);
            //for each business in businesses, create a string and relay back to user
        });
        
        sendResponseList(recipientID,businessArray);
        callYelpApi = false;  
	})
	.catch( function ( err ) {
		console.log( err);
        if (offset > 0){
            var tmp = "Wow, it seems like there are no more \" " + searchQuery + " \" spots around the area, try a different address!";
            sendResponse(recipientID,tmp);
            callYelpApi = false; 
        }
        else {
            sendResponse(recipientID,"Woops, it seems like there was an issue with your address");
        }
        
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

function sendResponseList(recipientID,businessArray){

    request({
        url: "https://graph.facebook.com/v2.8/me/messages",
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
                                    title: businessArray[0].name,
                                    subtitle: businessArray[0].display_phone,
                                    image_url: businessArray[0].image_url,
                                    buttons: [
                                        {
                                            type:  "postback",
                                            title: "Address",
                                            payload: generateBusinessString(businessArray[0])
                                        }
                                    ]
                                  },
                                    
                                  {
                                    title: businessArray[1].name,
                                    subtitle: businessArray[1].display_phone,
                                    image_url: businessArray[1].image_url,
                                    buttons: [
                                        {
                                            type:  "postback",
                                            title: "Address",
                                            payload: generateBusinessString(businessArray[1])
                                        }
                                    ]
                                  },

                                  {
                                    title: businessArray[2].name,
                                    subtitle: businessArray[2].display_phone,
                                    image_url: businessArray[2].image_url,
                                    buttons: [
                                        {
                                            type:  "postback",
                                            title: "Address",
                                            payload: generateBusinessString(businessArray[2])
                                        }
                                    ]
                                  },
                                
                                  {
                                    title: businessArray[3].name,
                                    subtitle: businessArray[3].display_phone,
                                    image_url: businessArray[3].image_url,
                                    buttons: [
                                        {
                                            type:  "postback",
                                            title: "Address",
                                            payload: generateBusinessString(businessArray[3])
                                        }
                                    ]
                                  }
                                ],
                                buttons: [
                                    {
                                        type: "postback",
                                        title: "View More",
                                        payload: "view more items"
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
            sender_action: "typing_on",
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

function Math_is_fun(signs,numbs){
    var execute = {
        '+': function (x, y) { return x + y },
        '-': function (x, y) { return x - y },
        '/': function (x, y) { return x / y },
        '*': function (x, y) { return x * y },
    }
    for (var i = 0; i < signs.length; i++){
        sum = execute[signs[i]](numbs[i],numbs[i+1]);
    }
};

app.listen(app.get('port'), function() {
	console.log("running: port");
});

