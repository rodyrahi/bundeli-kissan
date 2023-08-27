const express = require("express");
const app = express();
var router = express.Router();
var dbs = require('../database.js');


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

router.get('/createprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  if (dbs.find('kissan' , 'number' , number )) {
    res.redirect('/home');

  }else{
    res.render('profiles/createprofile', { phonenumber: number });

  }
});

router.post('/createprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  const { name, fathername, gender, dob, pincode, address } = req.body;

  await executeQuery(
    `INSERT INTO kissans (number,name , fathername , gender , dob , pincode , address) VALUES ('${number}','${name}','${fathername}' ,'${gender}' ,'${dob}','${pincode}','${address}')`
  );

  res.redirect('/home');
});

router.get('/userprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  const result = await executeQuery(
    `SELECT * FROM kissans WHERE number='${number}'`
  );

  console.log(result);

  res.render('userprofile', { phonenumber: number, user: result[0] });
});




module.exports = router