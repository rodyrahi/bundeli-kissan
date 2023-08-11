const express = require('express');
const app = express();
const axios = require('axios');
const fetch = require('node-fetch');
var con = require('./database.js');
const qrcode = require('qrcode-terminal');
// const { Client, LocalAuth } = require('whatsapp-web.js');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const upload = multer();


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


async function  sendmessage(number , message) {
  try {
    


    const apiUrl = 'https://wapi.kamingo.in/send-message'; // Replace with the actual API URL

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: number, message: message }),
    });



    if (response.ok) {
      const responseData = await response.json();
      console.log('API Response:', responseData);

    } else {
      console.error('API Error:', response.status);
      // Send a JSON response with status 'error'
    }
  } catch (error) {
    console.error('Error:', error);

  }
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


app.get('/privacy', (req, res) => {
  res.render('privacy');
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


app.get('/delete/:number/:id', async (req, res) => {
  const number = req.params.number;
  const id = req.params.id;

  const imagesResult = await executeQuery(
    `SELECT image FROM chats WHERE id='${id}'`
  );
  const images = imagesResult[0].image.split(',');

  images.forEach((image) => {
    const imagePath = path.join(__dirname, 'public', 'uploads', image.trim());
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Successfully deleted image: ${image}`);
      }
    });
  });

  await executeQuery(
    `DELETE FROM chats WHERE id='${id}'`
  );

  res.redirect('/query/' + number);
});



app.get('/query/:number', async (req, res) => {
  const number = req.params.number;

  const chats = await executeQuery('SELECT * FROM chats');

  const name = await executeQuery(
    `SELECT name FROM kissans WHERE number='${number}'`
  );
  res.render('query', { chats: chats  , name:name[0].name , phonenumber:number} );
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
      const filePath = path.join(__dirname, 'public', 'uploads');
  
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
    `INSERT INTO chats (chat, number, name, image) VALUES ('${textInput}', '${number}', '${name[0].name}', '${fileNames}')`
  );

  res.redirect('/query/' + number);
});


var randomCode;

app.post('/sendcode', async (req, res) => {
  const { phonenumber } = req.body;
  const number = phonenumber;

  const generateRandomCode = () => {
    const codeLength = 4;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }
    return code;
  };

  randomCode = generateRandomCode();


  const message = 'Your Bundeli Kisan Authentication Code is : ' + '*'+generateRandomCode()+'*';
  console.log(number , randomCode);



  sendmessage(number , message).then(() => {
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


  // client
  //   .sendMessage(`${+number}@c.us`, randomCode)
  //   .then(() => {
  //     console.log('Message sent successfully');
  //     const result = executeQuery(`SELECT * FROM chats WHERE number='${number}'`);

  //     if (result.length < 1) {
  //       executeQuery(`INSERT INTO chats (number) VALUES ('${number}')`);
  //     }

  //     res.render('typecode', { number: number });
  //   })
  //   .catch((error) => {
  //     console.error('Error sending message:', error);
  //     res.sendStatus(500); // Send an error response to the client
  //   });
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

app.get('/expertlogin', async (req, res) => {
  res.render('expertlogin');
});

app.get('/expert', async (req, res) => {
  const chats = await executeQuery('SELECT * FROM chats');

  res.render('expert', { chats: chats})
});

app.post('/expertreply', async (req, res) => {

  const {reply , number} = req.body


  await executeQuery(`UPDATE chats SET reply='${reply}', status='solved' WHERE number='${number}'`);




    res.redirect('/expert');





});

app.post('/expertlogin', async (req, res) => {

  const {name , password} = req.body


  const expert = await executeQuery(`SELECT * FROM experts WHERE user='${name}' AND pass='${password}'`)

  console.log(expert);


  if (expert.length > 0) {

    res.redirect('/expert');


  }else{
    res.redirect('/');

  }


});

app.get('/notification/:number', async (req, res) => {
  const number = req.params.number
  const chats = await executeQuery(`SELECT * FROM chats WHERE number='${number}'`);

  res.render('notification', { phonenumber: number , chats:chats})
});

app.post('/savepost', upload.array('image'), async (req, res) => {
  const fileNames = req.files.map(file => file.originalname);
  const files = req.files;



  const { textInput } = req.body;



  const imagesResult = await executeQuery(
    `SELECT images FROM adminposts WHERE name='admin'`
  );
  const images = imagesResult[0].images.split(',');

  images.forEach((image) => {
    const imagePath = path.join(__dirname, 'public', 'uploads','admin', image.trim());
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Successfully deleted image: ${image}`);
      }
    });
  });

  await executeQuery(`DELETE FROM adminposts WHERE name='admin';`)



  if (files) {
    files.forEach((file, index) => {
      const fileName = fileNames[index];
      const filePath = path.join(__dirname, 'public', 'uploads' , 'admin');
  
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
    `INSERT INTO adminposts (message, images) VALUES ('${textInput}', '${fileNames}')`
  );

  res.redirect('/admindashboard')
});

app.post('/deleteuser', async (req, res) => {
  const {deletename} = req.body



  await executeQuery(`DELETE FROM experts WHERE user='${deletename}';`)

  res.redirect('/admindashboard')
});

app.post('/createuser', async (req, res) => {
  const {name , password} = req.body
  await executeQuery(`INSERT INTO experts (user , pass) VALUES ('${name}' , '${password}')`)
  res.redirect('/admindashboard')
});


app.get('/admindashboard', async (req, res) => {
  const experts = await executeQuery(`SELECT * FROM experts`);

  res.render('admin' , {experts:experts})
});

app.post('/admin', async (req, res) => {
  const {name , adminpass} = req.body
  const admin = await executeQuery(`SELECT * FROM admin WHERE name='${name}' AND pass='${adminpass}'`);

  if (admin.length > 0) {
    res.redirect('/admindashboard')

  }

});



app.get('/admin', async (req, res) => {
    res.render('adminlogin')
});


app.get('/mandi/:number', async (req, res) => {
  const number = req.params.number
  const post = await executeQuery(`SELECT * FROM adminposts`);

  res.render('mandi' ,{ phonenumber: number , posts:post})
});


app.listen(7777, () => {
  console.log('Server is running on port 7777');
});
