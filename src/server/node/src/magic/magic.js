import sessionless from 'sessionless-node';
import db from '../persistence/db.js';
import fount from 'fount-js';

sessionless.generateKeys(() => {}, db.getKeys);

const SUBDOMAIN = process.env.SUBDOMAIN || 'dev';
fount.baseURL = process.env.LOCALHOST ? 'http://localhost:3006/' : `https://${SUBDOMAIN}.fount.allyabase.com/`;

let fountUser;

// Helper to get fount user (Aretha's service account)
const getFountUser = async () => {
  if (!fountUser) {
    // Try to load from db
    try {
      const aretha = await db.getUserByUUID('aretha');
      if (aretha && aretha.fountUUID) {
        fountUser = { uuid: aretha.fountUUID, pubKey: aretha.fountPubKey };
      }
    } catch (err) {
      console.warn('Could not load fount user');
    }
  }
  return fountUser;
};

const MAGIC = {
  joinup: async (spell) => {
    // Gateway forwarding logic (if needed)
    const gateway = await MAGIC.gatewayForSpell(spell.spellName);
    spell.gateways.push(gateway);
    const spellName = spell.spell;

    const aretha = await db.getUserByUUID('aretha');
    const spellbooks = aretha.spellbooks;
    const spellbook = spellbooks.filter(spellbook => spellbook[spellName]).pop();
    if (!spellbook) {
      throw new Error('spellbook not found');
    }

    const spellEntry = spellbook[spellName];
    const currentIndex = spellEntry.destinations.indexOf(spellEntry.destinations.find(($) => $.stopName === 'aretha'));
    const nextDestination = spellEntry.destinations[currentIndex + 1].stopURL + spellName;

    const res = await MAGIC.forwardSpell(spell, nextDestination);
    const body = await res.json();

    if (!body.success) {
      return body;
    }

    if (!body.uuids) {
      body.uuids = [];
    }
    body.uuids.push({
      service: 'aretha',
      uuid: 'nineum-tickets'
    });

    return body;
  },

  linkup: async (spell) => {
    const gateway = await MAGIC.gatewayForSpell(spell.spellName);
    spell.gateways.push(gateway);

    const res = await MAGIC.forwardSpell(spell, fount.baseURL);
    const body = await res.json();
    return body;
  },

  gatewayForSpell: async (spellName) => {
    const aretha = await db.getUserByUUID('aretha');
    const gateway = {
      timestamp: new Date().getTime() + '',
      uuid: aretha.fountUUID,
      minimumCost: 20,
      ordinal: aretha.ordinal || 0
    };

    const message = gateway.timestamp + gateway.uuid + gateway.minimumCost + gateway.ordinal;
    gateway.signature = await sessionless.sign(message);

    return gateway;
  },

  forwardSpell: async (spell, destination) => {
    return await fetch(destination, {
      method: 'post',
      body: JSON.stringify(spell),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // 🪄 MAGIC-ROUTED ENDPOINTS (No auth needed - resolver authorizes)

  arethaUserCreate: async (spell) => {
    try {
      const { pubKey } = spell.components;

      if (!pubKey) {
        return {
          success: false,
          error: 'Missing required field: pubKey'
        };
      }

      // Create fount user if doesn't exist
      let newFountUser;
      const timestamp = Date.now().toString();

      try {
        // Generate signature for fount request
        sessionless.getKeys = db.getKeys;
        const signature = await sessionless.sign(timestamp + pubKey);

        const check = await fetch(`${fount.baseURL}user/${pubKey}?timestamp=${timestamp}&signature=${signature}`);
        const maybeUser = await check.json();
        if (maybeUser.uuid) {
          newFountUser = maybeUser;
        }
      } catch (err) {
        console.warn('No fount user found, creating one');
      }

      if (!newFountUser) {
        const fountPayload = {
          timestamp,
          pubKey
        };

        sessionless.getKeys = db.getKeys;
        fountPayload.signature = await sessionless.sign(timestamp + pubKey);

        const resp = await fetch(`${fount.baseURL}user/create`, {
          method: 'put',
          body: JSON.stringify(fountPayload),
          headers: { 'Content-Type': 'application/json' }
        });

        newFountUser = await resp.json();
      }

      const foundUser = await db.putUser({ pubKey, fountUser: newFountUser });

      return {
        success: true,
        user: foundUser
      };
    } catch (err) {
      console.error('arethaUserCreate error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  arethaUserTickets: async (spell) => {
    try {
      const { uuid, flavor, quantity } = spell.components;

      if (!uuid || !flavor || !quantity) {
        return {
          success: false,
          error: 'Missing required fields: uuid, flavor, quantity'
        };
      }

      // Validate flavor format (12 hex characters)
      if (!/^[0-9a-f]{12}$/i.test(flavor)) {
        return {
          success: false,
          error: 'Invalid flavor format (must be 12 hex characters)'
        };
      }

      const fountUser = await getFountUser();
      if (!fountUser) {
        return {
          success: false,
          error: 'Fount user not available'
        };
      }

      const timestamp = Date.now().toString();

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
      sessionless.getKeys = db.getKeys;
      payload.signature = await sessionless.sign(fountMessage);

      const url = `${fount.baseURL}user/${fountUser.uuid}/nineum`;

      const resp = await fetch(url, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      const nineumObject = await resp.json();

      if (nineumObject.uuid === fountUser.uuid) {
        return { success: true };
      }

      return { success: false, error: 'Nineum purchase failed' };
    } catch (err) {
      console.error('arethaUserTickets error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  arethaUserPurchase: async (spell) => {
    try {
      const { flavor, quantity } = spell.components;
      const buyerUUID = spell.casterUUID;

      if (!buyerUUID) {
        return {
          success: false,
          error: 'Missing casterUUID (buyer UUID)'
        };
      }

      if (!flavor) {
        return {
          success: false,
          error: 'Missing required field: flavor'
        };
      }

      // Validate flavor format (12 hex characters)
      if (!/^[0-9a-f]{12}$/i.test(flavor)) {
        return {
          success: false,
          error: 'Invalid flavor format (must be 12 hex characters)'
        };
      }

      const transferQuantity = quantity || 1;

      const fount = await getFountUser();
      if (!fount) {
        return {
          success: false,
          error: 'Fount user not available'
        };
      }

      const timestamp = Date.now().toString();

      // Transfer nineum from Aretha's account to buyer
      const payload = {
        timestamp,
        destinationUUID: buyerUUID,
        charge: flavor.substring(0, 2),
        direction: flavor.substring(2, 4),
        rarity: flavor.substring(4, 6),
        size: flavor.substring(6, 8),
        texture: flavor.substring(8, 10),
        shape: flavor.substring(10, 12),
        quantity: transferQuantity
      };

      // Sign message: timestamp + fromUUID + destinationUUID + flavor + quantity
      const message = timestamp + fount.uuid + buyerUUID + flavor + transferQuantity;
      sessionless.getKeys = db.getKeys;
      payload.signature = await sessionless.sign(message);

      const url = `${fount.baseURL}user/${fount.uuid}/transfer`;

      const resp = await fetch(url, {
        method: 'post',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      const transferResult = await resp.json();
      console.log('Response from fount transfer:', transferResult);

      if (transferResult.success || transferResult.uuid === buyerUUID) {
        return {
          success: true,
          transfer: transferResult
        };
      }

      return { success: false, error: 'Nineum transfer failed' };
    } catch (err) {
      console.error('arethaUserPurchase error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  arethaUserGrant: async (spell) => {
    try {
      const { uuid } = spell.components;

      if (!uuid) {
        return {
          success: false,
          error: 'Missing required field: uuid'
        };
      }

      const timestamp = Date.now().toString();

      const payload = {
        timestamp,
        uuid
      };

      const message = timestamp + uuid;
      sessionless.getKeys = db.getKeys;
      payload.signature = await sessionless.sign(message);

      const resp = await fetch(`${fount.baseURL}user/${uuid}/nineum/admin`, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      const updatedUser = await resp.json();
      console.log('Response from fount admin:', updatedUser);

      return { success: true };
    } catch (err) {
      console.error('arethaUserGrant error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  },

  arethaUserGalaxy: async (spell) => {
    try {
      const { uuid, galaxy } = spell.components;

      if (!uuid || !galaxy) {
        return {
          success: false,
          error: 'Missing required fields: uuid, galaxy'
        };
      }

      const timestamp = Date.now().toString();

      const payload = {
        timestamp,
        uuid,
        galaxy
      };

      const message = timestamp + uuid;
      sessionless.getKeys = db.getKeys;
      payload.signature = await sessionless.sign(message);

      const resp = await fetch(`${fount.baseURL}user/${uuid}/nineum/galactic`, {
        method: 'put',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      const galactic = await resp.json();
      console.log('Response from fount galactic:', galactic);

      return {
        success: true,
        data: galactic
      };
    } catch (err) {
      console.error('arethaUserGalaxy error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
};

export default MAGIC;
