const accessToken = 'pk.eyJ1IjoicmlmYWRyaWFuIiwiYSI6ImNtY2RodmdraDBpZ3cybHNhb2pwc2UwZnIifQ.pcWX3WvpezeeC9kp-KNoGA';
let locations = [];

fetch('us-locations.json')
  .then(res => res.json())
  .then(data => { locations = data.map(loc => loc.name); });

function setupSuggestions(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    list.innerHTML = '';

    if (!query) return;

    const matches = locations.filter(loc => loc.toLowerCase().includes(query)).slice(0, 10);
    matches.forEach(match => {
      const div = document.createElement('div');
      div.textContent = match;
      div.onclick = () => {
        input.value = match;
        list.innerHTML = '';
      };
      list.appendChild(div);
    });
  });
}

setupSuggestions('from', 'fromList');
setupSuggestions('to', 'toList');

async function geocodeLocation(location) {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${accessToken}`
  );
  const data = await response.json();
  if (data.features && data.features.length > 0) {
    return data.features[0].center; // [lng, lat]
  }
  return null;
}

async function calculateCost() {
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const mpg = parseFloat(document.getElementById('mpg').value);
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value);
  const resultBox = document.getElementById('result');

  if (!from || !to || !mpg || !fuelPrice) {
    resultBox.innerHTML = 'Please fill in all fields.';
    return;
  }

  const fromCoords = await geocodeLocation(from);
  const toCoords = await geocodeLocation(to);

  if (!fromCoords || !toCoords) {
    resultBox.innerHTML = 'One or both locations could not be found.';
    return;
  }

  const coordsQuery = `${fromCoords.join(',')};${toCoords.join(',')}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsQuery}?access_token=${accessToken}&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || !data.routes[0]) {
      resultBox.innerHTML = 'Route not found.';
      return;
    }

    const meters = data.routes[0].distance;
    const miles = meters / 1609.344;

    const costOneWay = ((miles / mpg) * fuelPrice).toFixed(2);
    const costRoundTrip = (costOneWay * 2).toFixed(2);

    resultBox.innerHTML = `
      <div>The cost of driving from <strong>${from}</strong> to <strong>${to}</strong> is:</div>
      <div style="margin-top: 0.75em;"><strong>$${costOneWay}</strong> one-way | <strong>$${costRoundTrip}</strong> round trip.</div>
    `;
  } catch (error) {
    resultBox.innerHTML = 'Failed to calculate cost. Check console for details.';
    console.error(error);
  }
}
