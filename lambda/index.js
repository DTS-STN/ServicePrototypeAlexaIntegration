/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const querystring = require('querystring');


const getCases = async (token, guid) => {
  try {
    const { data } = await axios.get(
        'https://api.us-east.apiconnect.appdomain.cloud/hmakhijadeloitteca-api/test/hfp-client-apis/v1/casedetails',{
        headers : {
        "Content-Type" : "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token,
        guid: guid
            }
        });
    console.log('Case data being returned is ****', data);
    return data;
  } catch (error) {
    console.error('cannot fetch cases', error);
  }
};

const getToken = async (username) => { 
    const tokenURL = 'https://keycloak.dev.dts-stn.com/auth/realms/benefit-service-dev/protocol/openid-connect/token';
    const body = {
        username: username,
        password: 'Password1', //password is hardcoded for now but can be recieved from the user similar to how its done for username
        client_id: 'benefit-service-frontend',
        grant_type: 'password'
    }

  try {
    const { data } = await axios.post(tokenURL, querystring.stringify(body), {
    headers : {
    "Content-Type" : "application/x-www-form-urlencoded"
    },
    withCredentials: true
    });
    console.log('Data being returned is ***', data)
    return data;
  } catch (error) {
    console.error('cannot fetch token', error);
  }
}

const breakItDown = (token) => { 

    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const buff = new Buffer(base64, 'base64');
    const payloadinit = buff.toString('ascii');
    const payload = JSON.parse(payloadinit);
    console.log(payload);
    return payload.guid;
}

const parseName = (name) => { 

    const parsed = name.split(' ');
    let parsedName = '';
    console.log("parsed name is ****", parsed);
    for (var i=0; i<parsed.length; i++) { 
    if(parsed[i] === 'dot') { 
         parsedName = parsedName + '.';
    }
    else {
    parsedName = parsedName + parsed[i];
    }
}
    return parsedName.toLowerCase();
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hi I am casey the case assistant, To start with can I have your username?';
        const repromptText = "Your name can be your legal name"

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

const CaptureNameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureNameIntent';
    },
    handle(handlerInput) {
        
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const name = handlerInput.requestEnvelope.request.intent.slots.name.value;
        sessionAttributes.UserName = name;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        
        const speakOutput = `Thanks ${name},How can I help you today?`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};


const CheckMyCasesIntentHandler = {
   canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetMyCasesIntent';
  },
  async handle(handlerInput) {
    // const name = handlerInput.requestEnvelope.request.intent.slots.name.value; 
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const parsedName = parseName(sessionAttributes.UserName)
    let guid = '';
    let speechText = '';
    let cases = {};
    console.log('Value from user name is ******', sessionAttributes.UserName);
    console.log('Value from user name is ******', parsedName);
    
    try {
      const token = await getToken(parsedName);
      console.log('Token is ******', token);
      if(token) { 
           guid = breakItDown(token.access_token);
           console.log('Guid is ******', guid);
           cases = await getCases(token.access_token, guid);      
      }
      else { 
          // if we are unable to to get a token for the specified user, for now use a default(hard coded username)
          // this condition should be handled differently. In realworld scenarios Alexa should reprompt for username.
           const defaultToken = await getToken('elizabeth.garcia');
           guid = breakItDown(defaultToken.access_token);
           cases = await getCases(defaultToken.access_token, guid);  
      }
     
      console.log('Cases in handler are ******', cases, guid);
     
      
      //check if there are any cases available
      if(cases) { 
      const caseLength = cases.cases.length
      if(cases.cases && caseLength >= 1) {
          const list = cases.cases
          const firstCase = cases.cases[0];
          speechText = `Your first case is a ${firstCase.type} case, that currently has ${firstCase.status} status with reference number ${firstCase.reference}`;
      }
      }
      else { 
          speechText = 'Sorry I could not find any cases '
      }
    
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error(error);
    }
  },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CaptureNameIntentHandler,
        CheckMyCasesIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();