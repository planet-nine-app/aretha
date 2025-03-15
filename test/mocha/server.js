import { should } from 'chai';
should();
import sessionless from 'sessionless-node';
import superAgent from 'superagent';

const baseURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.aretha.allyabase.com/` : 'http://127.0.0.1:7277/';
const fountURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.fount.allyabase.com/` : 'http://127.0.0.1:3006/';

const get = async function(path) {
  console.info("Getting " + path);
  return await superAgent.get(path).set('Content-Type', 'application/json');
};

const put = async function(path, body) {
  console.info("Putting " + path);
  console.info("and sending ", body);
  return await superAgent.put(path).send(body).set('Content-Type', 'application/json');
};

const post = async function(path, body) {
  console.info("Posting " + path);
console.log(body);
  return await superAgent.post(path).send(body).set('Content-Type', 'application/json');
};

const _delete = async function(path, body) {
  //console.info("deleting " + path);
  return await superAgent.delete(path).send(body).set('Content-Type', 'application/json');
};

let savedUser = {};
let fountUser = {};
let keys = {};
let keysToReturn = {};

it('should register a user', async () => {
  keys = await sessionless.generateKeys((k) => { keysToReturn = k; }, () => {return keysToReturn;});
/*  keys = {
    privateKey: 'd6bfebeafa60e27114a40059a4fe82b3e7a1ddb3806cd5102691c3985d7fa591',
    pubKey: '03f60b3bf11552f5a0c7d6b52fcc415973d30b52ab1d74845f1b34ae8568a47b5f'
  };*/
  const payload = {
    timestamp: new Date().getTime() + '',
    pubKey: keys.pubKey,
  };

  payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

  const res = await put(`${baseURL}user/create`, payload);
console.log(res.body);
  savedUser = res.body;
  res.body.uuid.length.should.equal(36);
}).timeout(60000);

it('should get user with account id', async () => {
  const timestamp = new Date().getTime() + '';

  const signature = await sessionless.sign(timestamp + savedUser.uuid);

  const res = await get(`${baseURL}user/${savedUser.uuid}?timestamp=${timestamp}&signature=${signature}`);
console.log('get user with account', res.body);
  res.body.uuid.should.equal(savedUser.uuid);
  savedUser = res.body;
});

it('should grant admin nineum', async () => {
  const payload = {
    timestamp: new Date().getTime() + '',
    pubKey: keys.pubKey
  };

  payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

  const fountRes = await put(`${fountURL}user/create`, payload);  
  const fountUser = fountRes.body;

  const galacticPayload = {
    timestamp: new Date().getTime() + '',
    uuid: fountUser.uuid,
    galaxy: '28880014'
  };

  const galacticMessage = galacticPayload.timestamp + fountUser.uuid;

  galacticPayload.signature = await sessionless.sign(galacticMessage);  

  const galacticRes = await put(`${fountURL}user/${fountUser.uuid}/nineum/galactic`, galacticPayload);

  const galacticUser = galacticRes.body;

  const adminPayload = {
    timestamp: new Date().getTime() + '',
    uuid: fountUser.uuid,
  };

  const message = adminPayload.timestamp + adminPayload.uuid;
  adminPayload.signature = await sessionless.sign(message);

  const adminRes = await put(`${baseURL}user/${fountUser.uuid}/grant`, adminPayload);

  const successObj = adminRes.body;
  successObj.success.should.equal(true);
});

it('should get a flavor for tickets', async () => {
  const payload = {
    timestamp: new Date().getTime() + '',
    quantity: 10
  };

  const flavor = '010203040506';

  const message = payload.timestamp + savedUser.uuid + flavor + payload.quantity;
  payload.signature = await sessionless.sign(message);

  const res = await put(`${baseURL}user/${savedUser.uuid}/tickets/${flavor }`, payload);
 
  const successObj = res.body;
console.log('nineum?', res.body);
  successObj.success.should.equal(true);;
});

it('should see how many tickets of a flavor are remaining', async () => {
  // TODO
});
