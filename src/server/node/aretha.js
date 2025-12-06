import express from 'express';
import cors from 'cors';
import { createHash } from 'node:crypto';
import db from './src/persistence/db.js';
import fount from 'fount-js';
import bdo from 'bdo-js';
import sessionless from 'sessionless-node';
import gateway from 'magic-gateway-js';
import MAGIC from './src/magic/magic.js';

const allowedTimeDifference = process.env.ALLOWED_TIME_DIFFERENCE || 300000; // keep this relaxed for now

const app = express();
app.use(cors());
app.use(express.json());

const SUBDOMAIN = process.env.SUBDOMAIN || 'dev';
fount.baseURL = process.env.LOCALHOST ? 'http://localhost:3006/' : `https://${SUBDOMAIN}.fount.allyabase.com/`;
bdo.baseURL = process.env.LOCALHOST ? 'http://localhost:3003/' : `https://${SUBDOMAIN}.bdo.allyabase.com/`;
const bdoHashInput = `${SUBDOMAIN}aretha`;

const bdoHash = createHash('sha256').update(bdoHashInput).digest('hex');

const repeat = (func) => {
  setTimeout(func, 2000);
};

let fountUser;

const bootstrap = async () => {
  try {
    // Check if Aretha is already bootstrapped
    let existingAretha;
    try {
      existingAretha = await db.getUserByUUID('aretha');
      console.log('📦 Found existing Aretha user:', existingAretha);
    } catch(err) {
      console.log('🆕 No existing Aretha user found, creating new one');
    }

    // Create or get existing Fount user
    fountUser = await fount.createUser(db.saveKeys, db.getKeys);
console.log('f', fountUser);

    const bdoUUID = existingAretha?.bdoUUID || await bdo.createUser(bdoHash, {}, () => {}, db.getKeys);
console.log('b', bdoUUID);

    const spellbooks = existingAretha?.spellbooks || await bdo.getSpellbooks(bdoUUID, bdoHash);
console.log('there are ' + spellbooks.length + ' spellbooks');

    // Check if galaxy already claimed
    const arethaGalaxy = '41524554'; // "ARET" in hex (0x41524554)
    let hasGalaxy = existingAretha?.galaxy === arethaGalaxy;

    // If no galaxy yet, claim it
    if (!hasGalaxy) {
      console.log('🌌 Claiming Aretha galaxy...');
      try {
        const timestamp = Date.now().toString();

        const payload = {
          timestamp,
          uuid: fountUser.uuid,
          galaxy: arethaGalaxy
        };

        const message = timestamp + fountUser.uuid + arethaGalaxy;
        sessionless.getKeys = db.getKeys;
        payload.signature = await sessionless.sign(message);

        const galaxyResp = await fetch(`${fount.baseURL}user/${fountUser.uuid}/nineum/galactic`, {
          method: 'put',
          body: JSON.stringify(payload),
          headers: {'Content-Type': 'application/json'}
        });

        const galaxyResult = await galaxyResp.json();
        console.log('🌌 Galaxy claim response:', galaxyResult);

        // Verify we got galactic nineum
        if (galaxyResult.nineum && galaxyResult.nineum.some(n => n.slice(14, 16) === 'ff')) {
          console.log('✅ Aretha now has Galactic permissions in galaxy 41524554');
          hasGalaxy = true;
        } else if (galaxyResult.error && galaxyResult.error.includes('already claimed')) {
          console.log('ℹ️  Galaxy already claimed (possibly by this user), continuing...');
          hasGalaxy = true; // Mark as having galaxy even if already claimed
        } else {
          console.warn('⚠️  Galaxy claim returned unexpected response:', galaxyResult);
          // Don't fail bootstrap - we'll retry on next restart
        }
      } catch(galaxyErr) {
        console.error('❌ Failed to claim Aretha galaxy:', galaxyErr);
        // Don't throw - allow bootstrap to continue and retry later
      }
    } else {
      console.log('✅ Aretha already has galaxy 41524554');
    }

    const aretha = {
      uuid: 'aretha',
      fountUUID: fountUser.uuid,
      fountPubKey: fountUser.pubKey,
      bdoUUID,
      spellbooks,
      galaxy: hasGalaxy ? arethaGalaxy : existingAretha?.galaxy // Store galaxy ID if claimed
    };

    if(!aretha.fountUUID || !aretha.bdoUUID || !spellbooks) {
      throw new Error('bootstrap failed');
    }

    await db.saveUser(aretha);
    console.log('✅ Aretha bootstrap complete');
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

app.put('/user/:uuid/tickets/:flavor', async (req, res) => {
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
      timestamp,
      charge: flavor.substring(0, 2),
      direction: flavor.substring(2, 4),
      rarity: flavor.substring(4, 6),
      size: flavor.substring(6, 8),
      texture: flavor.substring(8, 10),
      shape: flavor.substring(10, 12),
      toUserUUID: fountUser.uuid,
      quantity: quantity
    };

    const fountMessage = timestamp + fountUser.uuid + payload.toUserUUID + flavor + quantity;
console.log('message', fountMessage);

    sessionless.getKeys = db.getKeys;
    payload.signature = await sessionless.sign(fountMessage);

    const url = `${fount.baseURL}user/${fountUser.uuid}/nineum`;

    const resp = await fetch(url, {
      method: 'put',
      body: JSON.stringify(payload),
      headers: {'Content-Type': 'application/json'}
    });

    const nineumObject = await resp.json();

    if(nineumObject.uuid === fountUser.uuid) {
      return res.send({success: true});
    }

    res.send({success: false});
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.put('/user/:uuid/grant', async (req, res) => {
  try {
    req.body.toUserUUID = fountUser.uuid;
    const resp = await fetch(`${fount.baseURL}user/${req.params.uuid}/nineum/admin`, {
      method: 'put',
      body: JSON.stringify(req.body),
      headers: {'Content-Type': 'application/json'}
    });

    const updatedUser = await resp.json();
console.log('response from fount admin', updatedUser);
    res.send({success: true});
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.get('/user/:uuid/tickets/:flavor/remaining', async (req, res) => {
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

    const updateTimestamp = new Date().getTime() + '';
//    const updateSignature = 
//    const resp = await fetch(`${fount.baseURL}user/${fountUser.uuid}

    // return the result
    
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.put('/user/:uuid/galaxy', async (req, res) => {
  try {
    const resp = await fetch(`${fount.baseURL}user/${req.params.uuid}/nineum/galactic`, {
      method: 'put',
      body: JSON.stringify(req.body),
      headers: {'Content-Type': 'application/json'}
    });

    const galactic = await resp.json();
console.log('response from fount is: ', galactic);

    res.send(galactic);
  } catch(err) {
console.warn(err);
    res.status(404);
    res.send({error: 'not found'});
  }
});

app.post('/magic/spell/:spellName', async (req, res) => {
  try {
    const spellName = req.params.spellName;
    console.log(`🪄 Received ${spellName} spell`);

    if (!MAGIC[spellName]) {
      res.status(404);
      return res.send({ error: 'spell not found' });
    }

    const result = await MAGIC[spellName](req.body);
    res.status(result.success ? 200 : 900);
    res.send(result);
  } catch (err) {
    console.error('Magic spell error:', err);
    res.status(404);
    res.send({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT || 7277);
console.log('I had a ticket to paradise, but I lost it');
