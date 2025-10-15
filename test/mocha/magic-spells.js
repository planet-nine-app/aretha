import { should } from 'chai';
should();
import sessionless from 'sessionless-node';
import fount from 'fount-js';

const baseURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.fount.allyabase.com/` : 'http://127.0.0.1:3006/';
fount.baseURL = baseURL;

let savedUser = {};
let keys = {};
let fountUser = {};

describe('Aretha MAGIC Spell Tests', () => {

  before(async () => {
    // Generate keys for testing
    keys = await sessionless.generateKeys(() => { return keys; }, () => { return keys; });

    // Create fount user for spell casting
    fountUser = await fount.createUser(() => keys, () => keys);
    console.log('Created fount user:', fountUser.uuid);
  });

  it('should create user via arethaUserCreate spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'arethaUserCreate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 0,
      components: {
        pubKey: keys.pubKey
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserCreate', spell);

    console.log('arethaUserCreate result:', result);

    result.should.have.property('success', true);
    result.should.have.property('user');
    result.user.should.have.property('uuid');
    result.user.uuid.length.should.equal(36);

    savedUser = result.user;
  });

  it('should grant admin nineum via arethaUserGrant spell', async () => {
    const timestamp = Date.now().toString();

    // First set galactic permissions
    const galacticSpell = {
      spell: 'arethaUserGalaxy',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 1,
      components: {
        uuid: fountUser.uuid,
        galaxy: '28880014'
      }
    };

    const galacticMessage = timestamp + galacticSpell.spell + galacticSpell.casterUUID + galacticSpell.totalCost + galacticSpell.mp + galacticSpell.ordinal;
    galacticSpell.casterSignature = await sessionless.sign(galacticMessage);

    const galacticResult = await fount.castSpell('arethaUserGalaxy', galacticSpell);
    console.log('arethaUserGalaxy result:', galacticResult);

    galacticResult.should.have.property('success', true);

    // Now grant admin nineum
    const grantTimestamp = Date.now().toString();
    const grantSpell = {
      spell: 'arethaUserGrant',
      casterUUID: fountUser.uuid,
      timestamp: grantTimestamp,
      totalCost: 50,
      mp: true,
      ordinal: 2,
      components: {
        uuid: fountUser.uuid
      }
    };

    const grantMessage = grantTimestamp + grantSpell.spell + grantSpell.casterUUID + grantSpell.totalCost + grantSpell.mp + grantSpell.ordinal;
    grantSpell.casterSignature = await sessionless.sign(grantMessage);

    const grantResult = await fount.castSpell('arethaUserGrant', grantSpell);
    console.log('arethaUserGrant result:', grantResult);

    grantResult.should.have.property('success', true);
  });

  it('should purchase nineum tickets via arethaUserTickets spell', async () => {
    const timestamp = Date.now().toString();

    const flavor = '010203040506'; // Example flavor

    const spell = {
      spell: 'arethaUserTickets',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 3,
      components: {
        uuid: savedUser.uuid,
        flavor: flavor,
        quantity: 10
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserTickets', spell);

    console.log('arethaUserTickets result:', result);

    result.should.have.property('success', true);
  });

  it('should set galaxy permissions via arethaUserGalaxy spell', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'arethaUserGalaxy',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 4,
      components: {
        uuid: fountUser.uuid,
        galaxy: '01234567'
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserGalaxy', spell);

    console.log('arethaUserGalaxy result:', result);

    result.should.have.property('success', true);
    result.should.have.property('data');
  });

  it('should fail to create user with missing pubKey', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'arethaUserCreate',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 5,
      components: {
        // Missing pubKey
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserCreate', spell);

    console.log('arethaUserCreate (missing pubKey) result:', result);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to purchase tickets with invalid flavor', async () => {
    const timestamp = Date.now().toString();

    const invalidFlavor = 'INVALID'; // Invalid flavor format

    const spell = {
      spell: 'arethaUserTickets',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 6,
      components: {
        uuid: savedUser.uuid,
        flavor: invalidFlavor,
        quantity: 10
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserTickets', spell);

    console.log('arethaUserTickets (invalid flavor) result:', result);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to grant with missing uuid', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'arethaUserGrant',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 7,
      components: {
        // Missing uuid
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserGrant', spell);

    console.log('arethaUserGrant (missing uuid) result:', result);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

  it('should fail to set galaxy with missing fields', async () => {
    const timestamp = Date.now().toString();

    const spell = {
      spell: 'arethaUserGalaxy',
      casterUUID: fountUser.uuid,
      timestamp,
      totalCost: 50,
      mp: true,
      ordinal: 8,
      components: {
        // Missing uuid and galaxy
      }
    };

    // Sign the spell
    const message = timestamp + spell.spell + spell.casterUUID + spell.totalCost + spell.mp + spell.ordinal;
    spell.casterSignature = await sessionless.sign(message);

    // Cast the spell
    const result = await fount.castSpell('arethaUserGalaxy', spell);

    console.log('arethaUserGalaxy (missing fields) result:', result);

    result.should.have.property('success', false);
    result.should.have.property('error');
  });

});
