require('dotenv').config();
const express = require('express');
const R = require('ramda');
const request = require('request-promise-native');

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

const getArcadeTilesAndReturnMessage = async () => {
  const arcade = await sendAndParseReq(setParams('https://overwatcharcade.today/api', {
    url: '/today',
  }));
  console.log('results from arcade: ', arcade);
  const createdAt = arcade[0].created_at;
  const tilesStr = R.pipe(
    R.props(['tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6', 'tile_7']),
    R.map(tile => `• ${tile.name} (${tile.players}) \n`),
    R.reduce((acc, newVal) => R.concat(newVal, acc), ''),
  )(arcade[0]);
  const message = `Hiya! These are the arcade games in Overwatch today (${new Date(createdAt).toLocaleDateString()}): \n\n${tilesStr}`;
  return message;
};

app.get('/zap', async (req, res) => {
  console.log('Someone zapped me!');
  const message = await getArcadeTilesAndReturnMessage();

  res.status(200).send({
    message,
  });
  return;
});

app.listen(port, () => console.log(`Listening on port ${port}!`));