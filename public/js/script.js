const button = document.getElementById('Start_button');
const listOfDevices = document.getElementById('listOfDevices');

button.addEventListener('click',async _=>
{
   let data = {
    methodName:'start',
    payload:'',
    deviceName:listOfDevices.options[listOfDevices.selectedIndex].id
    };
    console.log(JSON.stringify(data));
    try {     
    const response = await fetch('http://localhost:3000/handle', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      method: 'POST',
    });
    console.log('Completed!', response);
  } catch(err) {
    console.error(`Error: ${err}`);
  }
});

const button2 = document.getElementById('Stop_button');

button2.addEventListener('click',async _=>
{
   let data = {
    methodName:'stop',
    payload:'',
    deviceName:listOfDevices.options[listOfDevices.selectedIndex].id
    };
    console.log(JSON.stringify(data));
    try {     
    const response = await fetch('http://localhost:3000/handle', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      method: 'POST',
    });
    console.log('Completed!', response);
  } catch(err) {
    console.error(`Error: ${err}`);
  }
});