/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);
  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor() {
      this.deviceId;
      this.cityName;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.humidityData = new Array(this.maxLen);
      this.lat;
      this.lng;
    }
    Init(id,CityName,lat,lng) {
      this.deviceId=id;
      this.cityName = CityName;
      this.lat = lat;
      this.lng =lng;
    }

    addData(time, temperature, humidity) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
      }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        console.log(this.devices[i].deviceId + "  szukam: "+deviceId)
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }
    // Find city based on its device Id
    findDeviceCity(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i].cityName;
        }
      }
      return undefined;
    }
    // Find a device based on its city
    findDeviceByCity(city) {
      for (let i = 0; i < this.devices.length; ++i) {
        console.log(this.devices[i].lng+ " " +this.devices[i].lat+ " " +this.devices[i].cityName+ " " +this.devices[i].deviceId + "  szukam: "+city)
        if (this.devices[i].cityName === city) {
          return this.devices[i];
        }
      }
      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Humidity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Humidity (%)',
          display: true,
        },
        position: 'right',
      }]
    }
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDeviceByCity(listOfDevices[listOfDevices.selectedIndex].text);
    console.log("zmieniam na" + device.deviceId);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
    myLineChart.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      let messageArray = [messageData.DeviceId,messageData.IotData.temperature, messageData.IotData.humidity];
      console.log(messageData);

      // time and either temperature or humidity are required
      if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity)) {
        return;
      }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);
      
      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
      } 
      
      else {
        const newDeviceData=new DeviceData();
        if(messageData.IotData.let!=null && messageData.IotData.lng!=null)
        {
          newDeviceData.Init(messageData.DeviceId,messageData.IotData.cityName, parseFloat(messageData.IotData.let), parseFloat(messageData.IotData.lng));
          // add marker on a map
          
          Marker(messageData.IotData.cityName, parseFloat(messageData.IotData.let), parseFloat(messageData.IotData.lng), messageData.DeviceId);
          console.log("Stworzyłem: "+messageData.DeviceId+", z miasta: "+messageData.IotData.cityName);
        }
        else{
          console.log("Stworzyłem: "+messageData.DeviceId+", ale nie dostałem koordynatów.");
        }
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.IotData.cityName);
        node.appendChild(nodeText);
        node.setAttribute('id', messageData.DeviceId);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
  function Marker(cityName,lat,lng,DeviceId){
    console.log("Tworzę marker "+ cityName +" o koordynatach: lat: "+lat+" lng: "+lng)
    marker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map,
        title: cityName,
        Id: DeviceId
     });
     marker.addListener("click", () => {
      console.log("Przycisk "+cityName +" kliknał " + this);
      const options = Array.from(listOfDevices.options);
      options.forEach((option, i) => {
        if (option.id === DeviceId) listOfDevices.selectedIndex = i;
      });
      OnSelectionChange();
    });
    };
    
});

