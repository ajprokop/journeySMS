const axios = require("axios");
const functions = require('@google-cloud/functions-framework');

const JOURNEY_SEND_URL = "https://app.journeyid.io/api/system/executions";

/*
 * HTTP function that supports CORS requests.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
functions.http('journeySMS', (req, res) => { 
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
      // Send response to OPTIONS requests
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
    } else {
        let phoneToAuthenticate = req.body.sessionInfo.parameters["cust_phone"];
        let iframeId = req.body.sessionInfo.parameters["dashboardId"];
        let pipelineKey = req.body.sessionInfo.parameters["authenticationPipelineKey"];
        let callbackUrls = req.body.sessionInfo.parameters["callbackURLs"];
        let journeyToken = req.body.sessionInfo.parameters["journeyToken"];
        let callingParty = phoneToAuthenticate.substr(1); // Remove "+"
        JourneySendSMS(res, phoneToAuthenticate, iframeId, pipelineKey, callbackUrls, journeyToken, callingParty);
    }

});   

async function JourneySendSMS(res, PhoneToAuthenticate, iframeId, pipelineKey, callbackUrls, journeyToken, callingParty) {
    res.set('Content-Type', 'application/json');

	let TxtResponse = "";
	let jsonResponse = {
		"fulfillment_response": {
			"messages": [{
				"text": {
					"text": [TxtResponse]
				}
			}]
		},
		"session_info": {
			"parameters": {
				"JourneyReferenceId": null,
				"PhoneNoPlus": null
			}
		}
	};
	let RefId = makeId(8);
	let ExternalRef = callingParty + "-" + RefId + "-02";
	console.log("Journey Ref ID ->" + ExternalRef);

	let data = JSON.stringify({
		"delivery": {
			"method": "sms",
			"phoneNumber": PhoneToAuthenticate
		},
		"callbackUrls": [
			callbackUrls
		],
		"customer": {
			"uniqueId": callingParty
		},
		"session": {
			"externalRef": ExternalRef
		},
		"language": "en-US",
		"pipelineKey": pipelineKey,
		"iframeId": iframeId
	});

	let config = {
		method: 'post',
		//maxBodyLength: Infinity,
		url: JOURNEY_SEND_URL,
		headers: {
			'accept': 'application/json',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${journeyToken}`,
			'User-Agent': 'Axios 1.1.3'
		},
		data: data
	};

	try {
		const JourneySendResponse = await axios(config);
		console.dir(JourneySendResponse.data);
		jsonResponse.session_info.parameters.JourneyReferenceId = JourneySendResponse.data.session.externalRef;
		jsonResponse.session_info.parameters.PhoneNoPlus = callingParty;
        // Send results back to Dialogflow
        res.status(200).send(JSON.stringify(jsonResponse));
	} catch (e) {
		console.log("Journey Send Failed!");
		console.log(`Exception : ${e}`);
        // Send results back to Dialogflow
        res.status(200).send(JSON.stringify(jsonResponse));
	}


}

function makeId(length) {
	var result = "";
	var characters = "0123456789";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}