import express from 'express'
import { google } from "googleapis";
import bodyParser from "body-parser";

const app = express()
const port = 3000
const submittedUSN = [];
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))


//getting auth client 
const serviceAccountKeyFile = "./keys.json";
const sheetId = '1RAyGgT7Q_wE_G-SkC-WOo9zjXope_woxOtK-dDSS8ok'
const tabName = 'Sheet1'
const range = 'A:J'

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

//reading from sheets
async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });
  return res.data.values;
}

//writing to the sheets
async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      "majorDimension": "ROWS",
      "values": [data]
    },
  })
}

//getting the count of each club
async function clubCount() {
  const googleSheetClient = await _getGoogleSheetClient();
  const sheetData = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  const regClubList = sheetData.slice(1).map(subArray => subArray[4]);
  let clubCount = regClubList.reduce((acc, club) => {
    acc[club] = (acc[club] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(clubCount).map(([club, count]) => ({ [club]: count }));
}

// Homepage get request
app.get('/', async (req, res) => {
  try {
    const clubCountList = await clubCount();
    res.render('app', { display: null, club: null,clubCountList: clubCountList});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//get date and time
let currentTime = new Date();
let currentOffset = currentTime.getTimezoneOffset();
let ISTOffset = 330;   // IST offset UTC +5:30 
let ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset) * 60000);
// ISTTime now represents the time in IST coordinates
let hoursIST = ISTTime.getHours()
let minutesIST = ISTTime.getMinutes()
let secondsIST = ISTTime.getSeconds()
let time = hoursIST + ':' + minutesIST + ':' + secondsIST;

let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();
today = mm + '/' + dd + '/' + yyyy;

//form submission handling
app.post('/submit', async (req, res) => {
  const { name,rollno, usn, year, branch,phone,email, club,expectation } = req.body;
  const data = [name,rollno, usn, year, branch,phone,email, club,expectation, time + ',' + today];
  let display;

  const googleSheetClient = await _getGoogleSheetClient();
  const sheetData = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  const submittedUSN = sheetData.slice(1).map(subArray => subArray[2]);
  if (submittedUSN.includes(usn)) {
    display = false;
  } else {
    await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data)
    display = true;
  }
  const clubCountList = await clubCount();
  res.render('app', { display: display, club: club,clubCountList: clubCountList});
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
