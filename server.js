const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require("body-parser");
const router = express.Router();
const EventHubReader = require('./scripts/event-hub-reader.js');
fs = require('fs');


const iotHubConnectionString = process.env.IotHubConnectionString;
if (!iotHubConnectionString) {
  console.error(`Environment variable IotHubConnectionString must be specified.`);
  return;
}
console.log(`Using IoT Hub connection string [${iotHubConnectionString}]`);

const eventHubConsumerGroup = process.env.EventHubConsumerGroup;
console.log(eventHubConsumerGroup);
if (!eventHubConsumerGroup) {
  console.error(`Environment variable EventHubConsumerGroup must be specified.`);
  return;
}
console.log(`Using event hub consumer group [${eventHubConsumerGroup}]`);

// Redirect requests to the public subdirectory to the root
const app = express();

app.use(express.static(path.join(__dirname, 'public')));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/handle',(request,response) => {
  console.log(request.body.methodName);
  console.log(request.body.deviceName);
  console.log(request.body.payload);
  sendMessageToDevice(request.body.methodName,request.body.payload,request.body.deviceName);
});
 
app.use("/", router);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        //console.log(`Broadcasting data ${data}`); //show data in logs
        client.send(data);
      } catch (e) {
        console.error(e);
      }
    }
  });
};

server.listen(process.env.PORT || '3000', () => {
  console.log('Listening on %d.', server.address().port);
});


const eventHubReader = new EventHubReader(iotHubConnectionString, eventHubConsumerGroup);

(async () => {
  await eventHubReader.startReadMessage((message, date, deviceId) => {
    try {
      const payload = {
        IotData: message,
        MessageDate: date || Date.now().toISOString(),
        DeviceId: deviceId,
      };

      wss.broadcast(JSON.stringify(payload));
      fs.appendFile(path.join(__dirname, 'public\\StationSavedData.txt'), JSON.stringify(payload), function (err) {
        if (err) return console.log(err);
      });
    } catch (err) {
      console.error('Error broadcasting: [%s] from [%s].', err, message);
    }
  });
})().catch();


function sendMessageToDevice(_methodName,_payload,deviceName)
{
  var Client = require('azure-iothub').Client;
  var Message = require('azure-iot-common').Message;
  var serviceClient = Client.fromConnectionString(iotHubConnectionString);
  
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
    serviceClient.close();
  };
}

function receiveFeedback(err, receiver) {
  try{
  receiver.on('message', function (msg) {
    console.log('Feedback message:')
    console.log(msg.getData().toString('utf-8'));
  });
  }
  catch(err)
  {
    console.log(err)
  }
}

serviceClient.open(function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Service client connected');
    serviceClient.getFeedbackReceiver(receiveFeedback);
    var _DeviceMethodParams = { methodName:_methodName, payload: _payload };
    console.log('Sending message: ' +_methodName+ " " + _payload +" to: "+deviceName.toString());
    serviceClient.invokeDeviceMethod(deviceName, _DeviceMethodParams, printResultFor('send'));
  }
});
}
