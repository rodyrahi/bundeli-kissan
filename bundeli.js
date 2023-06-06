const express = require('express')
const app = express()
const axios = require('axios');
var con = require("./database.js");
const qrcode = require('qrcode-terminal');

const { Client , LocalAuth } = require('whatsapp-web.js');
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
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu",
      "--use-gl=egl",
    ],
  },
  authStrategy: new LocalAuth(),
  
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
  console.log('Client is ready!');

});

client.initialize();






app.set('view engine', 'ejs')

app.use(express.static("public"));
app.use(express.urlencoded({extended:false}))



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


app.get('/createprofile/:number',async (req, res) => {

  const number = req.params.number
  res.render('createprofile' , {phonenumber : number})

})
app.post('/createprofile/:number',async (req, res) => {

  const number = req.params.number
  const {name , fathername , gender , dob , pincode , address} = req.body

  await executeQuery(`INSERT INTO kissans (number,name , fathername , gender , dob , pincode , address) VALUES ('${number}','${name}','${fathername}' ,'${gender}' ,'${dob}','${pincode}','${address}')`)

  res.redirect('/home/'+number)

})

app.get('/userprofile/:number',async (req, res) => {

  const number = req.params.number
  const result = await executeQuery(`SELECT * FROM kissans WHERE number='${number}' `) 

  console.log(result);

  res.render('userprofile' , {phonenumber : number , user:result[0]})

})





app.get('/home/:phonenumber', (req, res) => {
  const phonenumber = req.params.phonenumber;
  console.log(phonenumber);

  axios(`https://api.openweathermap.org/data/2.5/weather?id=1264542&appid=404ae0fc6125b1b2ac81edc980993a31`)
    .then(response => {
      res.render('home', { weather: response.data, phonenumber:phonenumber });
    })
    .catch(error => {
      console.log('Error:', error);
    });

  // Issue: Multiple response can be sent if an error occurs or if the request is successful.

});




app.get('/', (req, res) => {


res.render('loginpage')


})






app.get('/chat/:number',async (req, res) => {
  const number = req.params.number

  console.log(number);
  try {
    const result =  await executeQuery(`SELECT (chat) FROM chats WHERE number='${number}'`)
    
    console.log(result);
    res.render('chat' , { phonenumber:number,chats:result})

  } catch (error) {
    res.render('chat' , {phonenumber:number})
  }

})

app.post('/savechat/:number', async (req, res) => {
  
  const number = req.params.number

  console.log(req.body);
  
  const { textInput  } = req.body

  await executeQuery(`INSERT INTO chats (chat , number) VALUES ('${textInput}' , '${number}')`)
  
  
  res.redirect( '/chat/'+number)
})


var randomCode
app.post('/sendcode', async (req, res) => {
  
  const { phonenumber } = req.body
  const number = '+91'+phonenumber
  console.log(req.body);
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
  client.sendMessage(`${+number}@c.us`, randomCode)
  .then(() => {
    console.log('Message sent successfully');

  })
  .catch((error) => {
    console.error('Error sending message:', error);

  });


  const result = await executeQuery(`SELECT * FROM chats WHERE number='${number}'`)

  if (result.length < 1) {
    await executeQuery(`INSERT INTO chats (number) VALUES ('${number}')`)

  }


  res.render('typecode' , {number:number})
})

app.post('/numberlogin', async (req, res) => {
  const {code , phonenumber} = req.body

  if (code === randomCode) {
    res.redirect('/createprofile/'+phonenumber )

  }
  res.render('whatsapplogin')

})




app.get('/whatsapplogin',async (req, res) => {
    res.render('whatsapplogin')
})


app.listen(7777)