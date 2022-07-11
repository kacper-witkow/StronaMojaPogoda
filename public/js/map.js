let map;
 function initMap() {
   map = new google.maps.Map(document.getElementById("map"), {
     center: { lat: 51.953145, lng: 19.28521 },
     zoom: 7,
     streetViewControl: false,
   })
}
