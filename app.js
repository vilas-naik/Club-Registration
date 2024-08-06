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
const serviceAccountKeyFile = "/etc/secrets/keys.json";
const sheetId = '1RAyGgT7Q_wE_G-SkC-WOo9zjXope_woxOtK-dDSS8ok'
const tabName = 'Sheet1'
const range = 'A:E'

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



//homepage get request
app.get('/', async (req, res) => {
  res.render('app');
})



//form submission handling
app.post('/submit', async (req, res) => {
  const { name, usn, department, semester, club } = req.body;
  const data = [name, usn, department, semester, club];

  const googleSheetClient = await _getGoogleSheetClient();
  const sheetData = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  const submittedUSN = sheetData.slice(1).map(subArray => subArray[1]);

  if (submittedUSN.includes(usn)) {
    console.log("already Submitted");
  } else {
    const googleSheetClient = await _getGoogleSheetClient();
    await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data)
  }
  res.redirect('/');
})







app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
