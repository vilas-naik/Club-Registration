import express from 'express'
import { google } from "googleapis";
import bodyParser from "body-parser";
import { CronJob } from 'cron';
import cron from "node-cron";
import https from 'https';

const app = express()
const port = 3000
const backendUrl = 'https://club-registration-v23y.onrender.com';
const submittedUSN = [];
let clubCountList ;
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))


//getting auth client 
const serviceAccountKeyFile = "./keys.json";
const sheetId = '1UEQ7k_KiRFg_q5jdhkYLzlVq1OZ2LCJgOmtQL-udTBA'
const tabName = 'Sheet1'
const range = 'A:G'

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
  const regClubList = sheetData.slice(1).map(subArray => subArray[5]);
  let clubCount = regClubList.reduce((acc, club) => {
    acc[club] = (acc[club] || 0) + 1;
    return acc;
  }, {});
  clubCountList= Object.entries(clubCount).map(([club, count]) => ({ [club]: count }));
}

// Homepage get request
app.get('/', async (req, res) => {
  try {
    await clubCount();
    res.render('app', { display: null, club: null,clubCountList: clubCountList});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




//form submission handling
app.post('/submit', async (req, res) => {
  await clubCount();
  const { name,rollno, usn, year, branch,phone,email, club,expectation } = req.body;
  const selectedClub = clubCountList.find(c => c.hasOwnProperty(club));
  let isnotEligible = false;
  if(selectedClub){isnotEligible = selectedClub[club] >= 7;}
  const data = [name,rollno.toUpperCase(), year, branch,phone, club,expectation];
  let display;

  const googleSheetClient = await _getGoogleSheetClient();
  const sheetData = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  let submittedUSN=[];
  const sliced = sheetData.slice(1);
  sliced.forEach(element => {
    submittedUSN.push(element[1])
  });
  if (submittedUSN.includes(rollno)) {
    display = false;
  }else if(isnotEligible){
    display = 'full'
  } 
  else {
    await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data)
    display = true;
  }
  await clubCount();
  res.render('app', { display: display, club: club,clubCountList: clubCountList});
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})






//cron job
cron.schedule('*/14 * * * *', () => {
  https
  .get(backendUrl, (res) => {
    if (res.statusCode === 200) {
      console.log('Server restarted');
    } else {
      console.error(`Failed to restart server with status code: ${res.statusCode}`);
    }
  })
  .on('error', (err) => {
    console.error('Error during restart:', err.message);
  });
  });

