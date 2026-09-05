import sessionless from 'sessionless-node';
  
// esbuild's CJS output target (used by Netlify's function bundler) doesn't
// support top-level await, so the client is now a lazily-resolved promise -
// call sites now do `(await client).get(...)` instead of `client.get(...)`.
const client = (async () => {
  const { createClient } = process.env.PERSISTENCE_BACKEND === 'netlify-blobs'
    ? await import('./client.netlify-blobs.js')
    : await import('./client.js');

  return createClient()
    .on('error', err => console.log('Client Error', err))
    .connect();
})();
    
const db = {
  getUserByUUID: async (uuid) => {
    const user = await (await client).get(`user:${uuid}`);
    if(!user) {
console.log('throwing');
      throw new Error('not found');
    }
    let parsedUser = JSON.parse(user);
    return parsedUser; 
  },

  getUserByPublicKey: async (pubKey) => {
    const uuid = await (await client).get(`pubKey:${pubKey}`);
    const user = await (await client).get(`user:${uuid}`);
    if(!user) {
      throw new Error('not found');
    }
    let parsedUser = JSON.parse(user);
    return parsedUser; 
  },

  putUser: async (user) => {
    const uuid = sessionless.generateUUID();
    user.uuid = uuid;
    await (await client).set(`user:${uuid}`, JSON.stringify(user));
    await (await client).set(`pubKey:${user.pubKey}`, uuid);
    return user;
  },

  saveUser: async (user) => {
    await (await client).set(`user:${user.uuid}`, JSON.stringify(user));
    return true;
  },

  deleteUser: async (user) => {
    await (await client).del(`pubKey:${user.pubKey}`);
    const resp = await (await client).del(`user:${user.uuid}`);

    return true;
  },

  saveKeys: async (keys) => {
    await (await client).set(`keys`, JSON.stringify(keys));
  },

  getKeys: async () => {
    const keyString = await (await client).get('keys');
    return JSON.parse(keyString);
  },

  putProduct: async (user, product) => {
console.log('putting product', product);
    const uuid = user.uuid;
    product.uuid = uuid;
    await (await client).set(`${user.uuid}:product:${product.title}`, JSON.stringify(product));
    
    const titlesJSON = (await (await client).get(`products:${uuid}`)) || '{}';
    const titles = JSON.parse(titlesJSON);
    titles[product.title] = product;
    await (await client).set(`products:${uuid}`, JSON.stringify(titles));
    return product;
  },

  getProduct: async (uuid, title) => {
    const product = await (await client).get(`${uuid}:product:${title}`);
    if(!product) {
      throw new Error('not found');
    }
    return JSON.parse(product);
  }

};

export default db;
