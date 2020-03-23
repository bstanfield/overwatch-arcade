require('dotenv').config();
const express = require('express');
const R = require('ramda');
const cron = require('node-cron');
const request = require('request-promise-native');

// twilio
const accountSid = process.env.SID;
const authToken = process.env.AUTH;
const client = require('twilio')(accountSid, authToken);

const app = express();
const port = 4444;

const setParams = (urlBase, props) => {
  const {
    url, method, body,
  } = props;
  return {
    url: `${urlBase}${url}`,
    method: R.defaultTo('GET', method),
    headers: {
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
      'User-Agent': 'request-promise',
    },
    body,
  };
};

const sendAndParseReq = async (params) => {
  const parsedResponse = request(params)
    .then(response => JSON.parse(response))
    .catch(err => err);
  return parsedResponse;
};

const people = [
  {
    name: 'Zachary',
    number: process.env.ZACHARY_NUMBER
  },
  {
    name: 'Benjamin',
    number: process.env.BENJAMIN_NUMBER
  },
  {
    name: 'Scott',
    number: process.env.SCOTT_NUMBER,
  }
];

const sendText = R.curry(async (message, person) => client.messages
  .create({
    body: message(person.name),
    from: '+15109747106',
    to: person.number,
  }));

const getArcadeTilesAndSendTexts = async () => {
  const arcade = await sendAndParseReq(setParams('https://overwatcharcade.today/api', {
    url: '/today',
  }));
  const createdAt = arcade[0].created_at;
  const tilesStr = R.pipe(
    R.props(['tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6', 'tile_7']),
    R.map(tile => `• ${tile.name} (${tile.players}) \n`),
    R.reduce((acc, newVal) => R.concat(newVal, acc), ''),
  )(arcade[0]);
  const message = R.curry(
    (name) => `Hiya ${name}. These are the arcade games in Overwatch today (${new Date(createdAt).toLocaleDateString()}): \n\n${tilesStr}`
  );

  const twilioPromises = R.map(sendText(message), people);
  await Promise.all(twilioPromises);
};

cron.schedule('* * * * *', async () => {
  console.log('Testing logs every 1 min...');
});

cron.schedule('0 8 * * *', async () => { // every day at 8 AM
  console.log('Running cron job at 8 AM');
  await getArcadeTilesAndSendTexts();
});

app.get('/api/', async (req, res) => {
  console.log('/api hit');
  res
    .status(200)
    .send(
      'Next cronjob at 8 AM.'
    )
}
);

app.listen(port, () => console.log(`Listening on port ${port}!`));