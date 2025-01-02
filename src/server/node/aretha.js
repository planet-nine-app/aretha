import express from 'express';
import { createHash } from 'node:crypto';
import db from './src/persistence/db.js';
import fount from 'fount-js';
import bdo from 'bdo-js';
import sessionless from 'sessionless-node';
import gateway from 'magic-gateway-js';

const allowedTimeDifference = process.env.ALLOWED_TIME_DIFFERENCE || 300000; // keep this relaxed for now

const app = express();
app.use(express.json());

const SUBDOMAIN = process.env.SUBDOMAIN || 'dev';
fount.baseURL = process.env.LOCALHOST ? 'http://localhost:3006/' : `${SUBDOMAIN}.fount.allyabase.com/`;
bdo.baseURL = process.env.LOCALHOST ? 'http://localhost:3003/' : `${SUBDOMAIN}.bdo.allyabase.com/`;
const bdoHashInput = `${SUBDOMAIN}aretha`;

const bdoHash = createHash('sha256').update(bdoHashInput).digest('hex');

const repeat = (func) => {
  setTimeout(func, 2000);
};

const bootstrap = async () => {
  try {
    const fountUser = await fount.createUser(db.saveKeys, db.getKeys);
console.log('f', fountUser);
    const bdoUUID = await bdo.createUser(bdoHash, {}, () => {}, db.getKeys);
console.log('b', bdoUUID);
    const spellbooks = await bdo.getSpellbooks(bdoUUID, bdoHash);
    const addie = {
      uuid: 'addie',
      fountUUID: fountUser.uuid,
      fountPubKey: fountUser.pubKey,
      bdoUUID,
      spellbooks
    };

    if(!addie.fountUUID || !addie.bdoUUID || !spellbooks || spellbooks.length === 0) {
      throw new Error('bootstrap failed');
    }

    await db.saveUser(addie);
  } catch(err) {
console.warn(err);
    repeat(bootstrap);
  }
};

repeat(bootstrap);

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > allowedTimeDifference) {
    return res.send({error: 'no time like the present'});
  }
  next();
});

app.use((req, res, next) => {
  console.log('\n\n', req.body, '\n\n');
  next();
});

app.put('/user/create', async (req, res) => {
  try {
    const pubKey = req.body.pubKey;
    const message = req.body.timestamp +  pubKey;
    const signature = req.body.signature;

    if(!signature || !sessionless.verifySignature(signature, message, pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    let newFountUser;

    try {
      const check = await fetch(`${fount.baseURL}user/${pubKey}?timestamp=${req.body.timestamp}&signature=${signature}`);
      const maybeUser = await check.json();
      if(maybeUser.uuid) {
        newFountUser = maybeUser;
      }
    } catch(err) {
console.warn('no fount user found, creating one');
    }
    
    if(!newFountUser) {
      const resp = await fetch(`${fount.baseURL}user/create`, {
	method: 'put',
	body: JSON.stringify(req.body),
	headers: {'Content-Type': 'application/json'}
      });

      newFountUser = await resp.json();
    }

    const foundUser = await db.putUser({ pubKey, fountUser: newFountUser });
    res.send(foundUser);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('/user/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const timestamp = req.query.timestamp;
    const signature = req.query.signature;
    const message = timestamp + uuid;

    const foundUser = await db.getUserByUUID(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    res.send(foundUser);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.put('user/:uuid/tickets/:flavor', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const flavor = req.params.flavor;
    const quantity = req.body.quantity;
    const timestamp = req.body.timestamp;
    const signature = req.body.signature;
    const message = timestamp + uuid + flavor + quantity;

    const foundUser = await db.getUserByUUID(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    const payload = {
      charge: flavor.substring(0, 2),
      direction: flavor.substring(2, 4),
      rarity: flavor.substring(4, 6),
      size: flavor.substring(6, 8),
      texture: flavor.substring(8, 10),
      shape: flavor.substring(10, 12),
      toUserUUID: fountUser.uuid,
      quantity: quanity
    };

    const fountMessage = timestamp + fountUser.uuid + flavor + quantity;

    sessionless.getKeys = db.getKeys;
    payload.signature = await sessionless.sign(fountMessage);

    const url = `${fount.baseURL}user/${foundUser.fountUser.uuid}/nineum`;

    const resp = fetch(url, {
      method: 'put',
      body: JSON.stringify(payload),
      headers: {'Content-Type': 'application/json'}
    });

    const nineumObject = await resp.json();

    res.send(nineumObject);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('user/:uuid/tickets/:flavor/remaining', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const flavor = req.params.flavor;
    const timestamp = req.query.timestamp;
    const signature = req.query.signature;
    const message = timestamp + uuid + flavor;
  
    const foundUser = await db.getUserByUUID(req.params.uuid);

    if(!signature || !sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'auth error'});
    }

    // send something to fount

    // return the result
    
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.put('user/:uuid/grant', async (req, res) => {
  try {
    req.body.toUserUUID = fountUser.uuid;
    const resp = fetch(`${fount.baseURL}user/${req.params.uuid}/nineum/admin`, {
      method: 'put',
      body: JSON.stringify(req.body),
      headers: {'Content-Type': 'application/json'}
    });

    const updatedUser = await resp.json();
    res.send(updatedUser);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.listen(process.env.PORT || 7277);
console.log('I had a ticket to paradise, but I lost it');
