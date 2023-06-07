const express = require('express');
const app = express();
const axios = require('axios');
var con = require('./database.js');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const upload = multer();

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't work in Windows
      "--disable-gpu",
      "--use-gl=egl",
    ],
  },
  authStrategy: new LocalAuth({
    clientId: 'raj',
  }),
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

function executeQuery(query) {
  return new Promise((resolve, reject) => {
    con.query(query, (err, result, fields) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


app.use(bodyParser.urlencoded({ extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Handle the POST request
app.post('/upload', upload.array('image'), (req, res) => {
  // Get the file names
  const fileNames = req.files.map(file => file.originalname);
  res.send(fileNames);
});




app.get('/', (req, res) => {
  res.render('loginpage');
});

app.get('/createprofile/:number', async (req, res) => {
  const number = req.params.number;
  res.render('createprofile', { phonenumber: number });
});

app.post('/createprofile/:number', async (req, res) => {
  const number = req.params.number;
  const { name, fathername, gender, dob, pincode, address } = req.body;

  await executeQuery(
    `INSERT INTO kissans (number,name , fathername , gender , dob , pincode , address) VALUES ('${number}','${name}','${fathername}' ,'${gender}' ,'${dob}','${pincode}','${address}')`
  );

  res.redirect('/home/' + number);
});

app.get('/userprofile/:number', async (req, res) => {
  const number = req.params.number;
  const result = await executeQuery(
    `SELECT * FROM kissans WHERE number='${number}'`
  );

  console.log(result);

  res.render('userprofile', { phonenumber: number, user: result[0] });
});

app.get('/home/:phonenumber', async (req, res) => {
  const phonenumber = req.params.phonenumber;
  console.log(phonenumber);

  try {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather?id=1264542&appid=404ae0fc6125b1b2ac81edc980993a31'
    );

    res.render('home', { weather: response.data, phonenumber: phonenumber });
  } catch (error) {
    console.log('Error:', error);
    res.sendStatus(500); // Send an error response to the client
  }
});

app.get('/chat/:number', async (req, res) => {
  const number = req.params.number;

  console.log(number);
  try {
    const result = await executeQuery(
      `SELECT (chat) FROM chats WHERE number='${number}'`
    );

    console.log(result);
    res.render('chat', { phonenumber: number, chats: result });
  } catch (error) {
    console.log(error);
    res.render('chat', { phonenumber: number });
  }
});

app.post('/savechat/:number', upload.array('image'), async (req, res) => {
  const number = req.params.number;
  const fileNames = req.files.map(file => file.originalname);
  const files = req.files;



  const { textInput } = req.body;

  const name = await executeQuery(
    `SELECT name FROM kissans WHERE number='${number}'`
  );


  if (files) {
    files.forEach((file, index) => {
      const fileName = fileNames[index];
      const filePath = path.join(__dirname, 'public', 'uploads', name[0].name);
  
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
  
      const fileFullPath = path.join(filePath, fileName);
      fs.writeFile(fileFullPath, file.buffer, err => {
        if (err) {
          console.error(err);
        }
      });
    });
  }
  



  await executeQuery(
    `INSERT INTO chats (chat, number, name, image) VALUES ('${textInput}', '${number}', '${name[0].name}', '${JSON.stringify(fileNames)}')`
  );

  res.redirect('/chat/' + number);
});


var randomCode;

app.post('/sendcode', async (req, res) => {
  const { phonenumber } = req.body;
  const number = '+91' + phonenumber;

  const generateRandomCode = () => {
    const codeLength = 6;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }
    return code;
  };

  randomCode = generateRandomCode();

  console.log(number);
  client
    .sendMessage(`${+number}@c.us`, randomCode)
    .then(() => {
      console.log('Message sent successfully');
      const result = executeQuery(`SELECT * FROM chats WHERE number='${number}'`);

      if (result.length < 1) {
        executeQuery(`INSERT INTO chats (number) VALUES ('${number}')`);
      }

      res.render('typecode', { number: number });
    })
    .catch((error) => {
      console.error('Error sending message:', error);
      res.sendStatus(500); // Send an error response to the client
    });
});

app.post('/numberlogin', async (req, res) => {
  const { code, phonenumber } = req.body;

  const user = await executeQuery(
    `SELECT * FROM kissans WHERE number='${phonenumber}'`
  );

  if (code === randomCode) {
    if (user.length > 0) {
      res.redirect('/home/' + phonenumber);
    } else {
      res.redirect('/createprofile/' + phonenumber);
    }
  } else {
    res.render('whatsapplogin');
  }
});

app.get('/whatsapplogin', async (req, res) => {
  res.render('whatsapplogin');
});

app.get('/query', async (req, res) => {
  const chats = await executeQuery('SELECT * FROM chats');
  res.render('query', { chats: chats });
});

app.listen(7777, () => {
  console.log('Server is running on port 7777');
});
