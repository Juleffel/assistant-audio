/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const AuthorizationV1 = require('watson-developer-cloud/authorization/v1');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
const AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk
const vcapServices = require('vcap_services');

var app = express();

app.enable('trust proxy');

app.use((req, res, next) => {
  if (req.secure || process.env.BLUEMIX_REGION === undefined) {
    next();
  } else {
    console.log('Redirecting to https');
    res.redirect('https://' + req.headers.host + req.url);
  }
});

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper

var assistant = new AssistantV1({
  version: '2018-07-10'
});

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  var workspace = process.env.WORKSPACE_ID || process.env.ASSISTANT_WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }

    return res.json(updateMessage(payload, data));
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Assistant service
 * @param  {Object} response The response from the Assistant service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

// STT @ TTS
// speech to text token endpoint
const sttCredentials = Object.assign(
  process.env.SPEECH_TO_TEXT_USERNAME ?
    {
      username: process.env.SPEECH_TO_TEXT_USERNAME, // or hard-code credentials here
      password: process.env.SPEECH_TO_TEXT_PASSWORD,
    } : {
      iam_apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY,
      iam_url: process.env.SPEECH_TO_TEXT_IAM_URL,
    },
  vcapServices.getCredentials('speech_to_text') // pulls credentials from environment in bluemix, otherwise returns {}
);
var sttAuthService = new AuthorizationV1(sttCredentials);
app.use('/api/speech-to-text/token', function (req, res) {
  sttAuthService.getToken(
    {
      url: process.env.SPEECH_TO_TEXT_URL || SpeechToTextV1.URL
    },
    function (err, token) {
      if (err) {
        console.log('Error retrieving token: ', err);
        res.status(500).send('Error retrieving token');
        return;
      }
      res.send(token);
    }
  );
});

// text to speech token endpoint
const ttsCredentials = Object.assign(
  process.env.TEXT_TO_SPEECH_USERNAME ?
    {
      username: process.env.TEXT_TO_SPEECH_USERNAME, // or hard-code credentials here
      password: process.env.TEXT_TO_SPEECH_PASSWORD,
    } : {
      iam_apikey: process.env.TEXT_TO_SPEECH_IAM_APIKEY,
      iam_url: process.env.TEXT_TO_SPEECH_IAM_URL,
    },
  vcapServices.getCredentials('text_to_speech') // pulls credentials from environment in bluemix, otherwise returns {}
);
var ttsAuthService = new AuthorizationV1(ttsCredentials);
app.use('/api/text-to-speech/token', function (req, res) {
  ttsAuthService.getToken(
    {
      url: process.env.TEXT_TO_SPEECH_URL || TextToSpeechV1.URL
    },
    function (err, token) {
      if (err) {
        console.log('Error retrieving token: ', err);
        res.status(500).send('Error retrieving token');
        return;
      }
      res.send(token);
    }
  );
});

module.exports = app;