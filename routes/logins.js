const express = require("express");
const app = express();
var router = express.Router();



var randomCode;



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


router.post('/sendcode', async (req, res) => {
  const { phonenumber } = req.body;


  req.session.phoneNumber = phonenumber 

  const generateRandomCode = () => {
    const codeLength = 4;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }
    return code;
  };

  randomCode = generateRandomCode();


  const message = 'Your Bundeli Kisan Authentication Code is : ' + '*'+ randomCode +'*';
  console.log(number , randomCode);



  sendmessage(phonenumber , message).then(() => {
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

router.post('/numberlogin', async (req, res) => {
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

router.get('/whatsapplogin', async (req, res) => {
  res.render('whatsapplogin');
});

router.get('/expertlogin', async (req, res) => {
  res.render('expertlogin');
});

router.post('/expertlogin', async (req, res) => {

    const {name , password} = req.body
  
  
    const expert = await executeQuery(`SELECT * FROM experts WHERE user='${name}' AND pass='${password}'`)
  
    console.log(expert);
  
  
    if (expert.length > 0) {
  
      res.redirect('/expert');
  
  
    }else{
      res.redirect('/');
  
    }
  
  
  });









module.exports = router