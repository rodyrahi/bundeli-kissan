const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { exec } = require('child_process');
const app = express();
const axios = require('axios');
const fetch = require('node-fetch');
var dbs = require('./database.js');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const upload = multer();

///////////////////////////////////// routes /////////////////////////////////////////

const loginRouter = require("./routes/logins.js");
const profileRouter = require("./routes/profile.js");

app.use("/", loginRouter);
app.use("/", profileRouter);


//////////////////////////////////////////////////////////////////////////////////////

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'your-secret-key',
  store: new FileStore({
    path: '/session/bundeli', // Choose a directory to store session files
    ttl: 86400 // Session expiration time in seconds (optional)
  }),
  resave: false,
  saveUninitialized: true
}));




function executeQuery(query) {
  return new Promise((resolve, reject) => {
    dbs.con.query(query, (err, result, fields) => {
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



app.get('/home', async (req, res) => {
  const phonenumber =  req.session.phoneNumber;
  console.log(phonenumber);


  if (req.session.phoneNumber) {
    

  try {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather?id=1273587&appid=404ae0fc6125b1b2ac81edc980993a31'
    );

    console.log(response.data.weather);
    res.render('home', { weather: response.data, phonenumber: phonenumber });
  } catch (error) {
    console.log('Error:', error);
    res.sendStatus(500); // Send an error response to the client
  }


}

else{
  res.redirect('/')
}
});

app.get('/chat', async (req, res) => {
  const number =  req.session.phoneNumber;

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



app.get('/query', async (req, res) => {
  const number =  req.session.phoneNumber;

  const chats = await executeQuery('SELECT * FROM chats');

  const name = await executeQuery(
    `SELECT name FROM kissans WHERE number='${'+91'+number}'`
  );
  console.log(name);
  res.render('query', { chats: chats  , name:name[0].name , phonenumber:number} );
});


app.post('/savechat', upload.array('image'), async (req, res) => {
  const number = req.session.phoneNumber;
  const fileNames = req.files.map(file => file.originalname);
  const files = req.files;



  const { textInput } = req.body;

  const name = await executeQuery(
    `SELECT name FROM kissans WHERE number='${'+91'+number}'`
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

  const scriptPath = './public/compress_images.sh'; // Update this with the actual path to your script

  exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
          console.error(`Error executing the script: ${error}`);
          return;
      }
  
      console.log(`Script output:\n${stdout}`);
  
      if (stderr) {
          console.error(`Script errors:\n${stderr}`);
      }
  });

  res.redirect('/query');
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



app.get('/notification', async (req, res) => {
  const number = req.session.phoneNumber
  const chats = await executeQuery(`SELECT * FROM chats WHERE number='${'+91'+number}'`);

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

  const scriptPath = './public/compress_images.sh'; // Update this with the actual path to your script

exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing the script: ${error}`);
        return;
    }

    console.log(`Script output:\n${stdout}`);

    if (stderr) {
        console.error(`Script errors:\n${stderr}`);
    }
});
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


app.get('/mandi', async (req, res) => {
  const number =  req.session.phoneNumber
  const post = await executeQuery(`SELECT * FROM adminposts`);

  res.render('mandi' ,{ phonenumber: number , posts:post})
});



app.get('/logout', (req, res) => {
  res.render('partials/logoutwarning')

});


app.get('/deletesession', (req, res) => {
  req.session.destroy(err => {

      res.redirect('/')
  });
});


app.listen(7777, () => {
  console.log('Server is running on port 7777');
});
