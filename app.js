window.onload = () => {

var lastFrame = null;

var users = {
  alice: {
    name: 'alice',
    balance: 100,
    chunksOwned: 0
  },
  bobby: {
    name: 'bobby',
    balance: 60,
    chunksOwned: 0
  },
  carl: {
    name: 'carl',
    balance: 200,
    chunksOwned: 0
  }
};
var numUsers = 3;

var taxRollover = 0;
var propertyTaxRate = 0.2;
var taxLastCollected = 0;
var taxPeriod = 1000*10; // one minute

var usersLog = document.getElementById('userlog');
var taxCountdownTimer = document.getElementById('tax-countdown');

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var chunkSize = { x: 50, y: 50 }; // in pixels
var dimensions = { x: 10, y: 10 }; // in chunks

canvas.width = dimensions.x * chunkSize.x;
canvas.height = dimensions.y * chunkSize.y;

var chunks = [];

// Initialize chunks
for (let x = 0; x < dimensions.x; x++) {
  for (let y = 0; y < dimensions.y; y++) {
    chunks.push({
      owner: null,
      color: {
        red: parseInt(Math.random() * 20),
        green: parseInt(Math.random() * 20),
        blue: parseInt(Math.random() * 20)
      },
      value: 1
    })
  }
}


function isBetween(val, min, max) {
  if (min <= val && val <= max) {
    return true;
  }

  return false;
}


function isValidPosition(pos) {
  if (isBetween(pos.x, 0, dimensions.x) && isBetween(pos.y, 0, dimensions.y)) {
    return true;
  }

  return false;
}


function isOwner(name, pos) {
  var idx = pos.x*dimensions.y + pos.y

  if (chunks[idx].owner == name) {
    return true;
  }

  return false;
}


function isValidColor(color) {
  if (isBetween(color.red, 0, 255) &&
      isBetween(color.green, 0, 255) &&
      isBetween(color.blue, 0, 255)) {
    return true;
  }

  return false;
}


function draw() {
  var idx = 0;
  var fillStyle = '';
  var red = 0;
  var green = 0;
  var blue = 0;
  var owner = null;

  for (let x = 0; x < dimensions.x; x++) {
    for (let y = 0; y < dimensions.y; y++) {
      idx = x*dimensions.y + y

      owner = chunks[idx].owner;
      if (chunks[idx].owner !== null) {
        //console.log(`chunk #${idx}: owner=${chunks[idx].owner}`);
      }

      red = chunks[idx].color.red;
      green = chunks[idx].color.green;
      blue = chunks[idx].color.blue;

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(x*chunkSize.x, y*chunkSize.y, chunkSize.x, chunkSize.y);
    }
  }
}


function setChunkValue(user, pos, value) {
  if (!isValidPosition(pos)) {
    console.log('Invalid postiion');
    return false;
  }

  if (!isOwner(user.name, pos)) {
    console.log('User does not own this chunk');
    return false;
  }

  var idx = pos.x*dimensions.y + pos.y;

  if (value < 0) {
    console.log('Cannot set a negative value for chunk');
    return false;
  }

  chunks[idx].value = value;
}


function buyChunk(user, pos) {
  if (!isValidPosition(pos)) {
    console.log('Invalid postiion');
    return false;
  }

  if (isOwner(user.name, pos)) {
    console.log('User already owns this chunk');
    return false;
  }

  var idx = pos.x*dimensions.y + pos.y;
  //console.log(idx);
  var value = chunks[idx].value;

  if (user.balance < chunks[idx].value) {
    console.log('User balance too low');
    return false;
  }

  users[user.name].balance -= chunks[idx].value;
  chunks[idx].owner = user.name;

  // adjust number of owned chunks for buyer
  users[user.name].chunksOwned += 1;

  console.log(`~${user.name} owns ${users[user.name].chunksOwned} chunks`);

  // and for seller (if one exists)
  if (chunks[idx].owner != null) {
    users[chunks[idx].owner].chunksOwned -= 1;
  }
}


function calcTax(value) {
  return Math.floor(propertyTaxRate * value);
}


function collectTaxes() {
  var idx = 0;
  var ownerName = ''
  var taxAmt = 0;
  var newBalance = 0;
  var taxRevenue = 0;

  for (let x = 0; x < dimensions.x; x++) {
    for (let y = 0; y < dimensions.y; y++) {
      idx = x*dimensions.y + y

      ownerName = chunks[idx].owner;
      if (ownerName !== null) {
        //console.log(`chunk #${idx}: owner=${ownerName}`);
        taxAmt = calcTax(chunks[idx].value);
        newBalance = Math.max(0, users[ownerName].balance-taxAmt);
        users[ownerName].balance = newBalance;
        taxRevenue += taxAmt;
      }
    }
  }

  return taxRevenue;
}


function distributeTaxes(taxRevenue) {
  var taxCredit = Math.floor(taxRevenue / numUsers);

  //console.log(`taxCredit: ${taxCredit}`);

  if (!taxCredit) {
    return;
  }

  taxRollover = taxRevenue - taxCredit * numUsers;

  for (var name of Object.keys(users)) {
    users[name].balance += taxCredit;
  }
}


function setColor(user, pos, color) {
  if (!isValidPosition(pos)) {
    console.log('Invalid postiion');
    return false;
  }

  if (!isOwner(user.name, pos)) {
    console.log('User does not own this block');
    return false;
  }

  if (!isValidColor(color)) {
    console.log('Not a valid color');
    return false;
  }

  var idx = pos.x*dimensions.y + pos.y;

  chunks[idx].color = color;

  //ctx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;
  //ctx.fillRect(pos.x*chunkSize.x, pos.y*chunkSize.y, chunkSize.x, chunkSize.y);
}

function writeUsersLog() {
  s = '';

  for (var name of Object.keys(users)) {
    //console.log(`${name} owns ${users[name].chunksOwned} chunks`);
    s += `@${users[name].name} | $${users[name].balance} | #${users[name].chunksOwned} \n`;
  }

  usersLog.innerText = s;
}


function writeTaxCountdown(timestamp) {
  var timeLeft = taxPeriod - (timestamp - taxLastCollected);
  taxCountdownTimer.innerText = `${Math.round(timeLeft/1000,2)} seconds`
}


function update(timestamp) {
  //console.log(timestamp)
  var timeLeft = taxPeriod - (timestamp - taxLastCollected);

  //console.log(`timeLeft: ${timeLeft}`);

  if (timeLeft < 0) {
    var taxRevenue = collectTaxes();
    taxRevenue += taxRollover;
    //console.log(`taxRevenue: ${taxRevenue}`)
    //console.log(chunks);

    if (0 < taxRevenue) {
        distributeTaxes(taxRevenue);
    }

    taxLastCollected = timestamp;

    //console.log('taxRollover: ${taxRollover}')
  }
}


function loop(timestamp) {
  var delta = timestamp - lastFrame;

  update(timestamp);
  draw();
  writeUsersLog();
  writeTaxCountdown(timestamp);

  lastFrame = timestamp;

  window.requestAnimationFrame(loop);
}

let red = { red: 255, green: 0, blue: 0 };
let green = { red: 0, green: 255, blue: 0 };
let blue = { red: 0, green: 0, blue: 255 };


// before we get started, lets give out some chunks
let aliceChunks = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 2 },
  { x: 5, y: 2 },
];
for (let i=0; i<aliceChunks.length; i++) {
  buyChunk(users.alice, aliceChunks[i]);
  setColor(users.alice, aliceChunks[i], red);
  setChunkValue(users.alice, aliceChunks[i], 5);
}

let bobbyPos = { x: 4, y: 4 };
buyChunk(users.bobby, bobbyPos);
setColor(users.bobby, bobbyPos, green);
setChunkValue(users.bobby, bobbyPos, 10);



window.requestAnimationFrame(loop);


}
