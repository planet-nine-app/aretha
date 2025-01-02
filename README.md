# Aretha

Aretha (named for the queen of soul herself, because whose ticket would you rather have?) is an [allyabase][allyabase] mini-service for associating digital inventory ([nineum][nienum]) to a user to sell, and subsequently do something with.
It's motivational use case is for digital ticketing, but is built abstractly to support other use cases.
Because it's built into allyabase, it supports [MAGICal][magic] purchase.

## Overview

So digital inventory of digital things is kind of a tricky thing. 
I was first exposed to this problem back in 2011 when the technical head at one of our clients sent me a long thread on how to hack your way to more gems in the hit mobile game Dragonvale, a favorite of his young son.

The problem is a fundamental one to games like Dragonvale, which rely on some state locally managed by a client's device. 
Somewhere on that device, the number of gems is stored. 
All you need to do is find where, and up that number, and you're breeding dragons for days!

To mitigate this, you need to store your state somewhere where those wiley users can't get to it--namely a server.
That way when someone tries to spend 100 gems, and the server knows they only have 20, the server can say, "no dice."

### The cloud

With digital things that do something meaningful in the real life, like a ticket, there's an added problem. 
Once you have this server-client relationship set up, the natural thing to do is simply replicate the client's state across their multiple devices. 
After all, in order to make those gem purchases, they need to go through a server. 

The problem there with a ticket, is that now you have a ticket that's replicated anywhere people can login as each other.
Now you can pull a Netflix, and just start booting people from your system when they do that, but this service isn't going to assume that every business out there wants to be a jerk to its customers.

At the same time, you want your ticket to work offline, because who knows what the network conditions are going to be when you use it.
To accomplish this, Aretha tracks where the digital thing is stored.
And of course it does this by turning you physical things into digital things to be inventory too.

## API

As per usual with allyabase services, there are some basic account endpoints, and then the endpoints for doing what the service does. 
In this case that's allocating a group of tickets, and then purchasing tickets from that group. 

<details>
 <summary><code>PUT</code> <code><b>/user/create</b></code> <code>Creates a new user if pubKey does not exist, and returns existing uuid if it does.</code></summary>

##### Parameters

> | name         |  required     | data type               | description                                                           |
> |--------------|-----------|-------------------------|-----------------------------------------------------------------------|
> | pubKey       |  true     | string (hex)            | the publicKey of the user's keypair  |
> | timestamp    |  true     | string                  | in a production system timestamps narrow window for replay attacks  |
> | signature    |  true     | string (signature)      | the signature from sessionless for the message  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json`                | `USER`   |
> | `400`         | `application/json`                | `{"code":"400","message":"Bad Request"}`                            |

##### Example cURL

> ```javascript
>  curl -X PUT -H "Content-Type: application/json" -d '{"pubKey": "key", "timestamp": "now", "signature": "sig"}' https://<placeholderURL>/user/create
> ```

</details>

<details>
 <summary><code>GET</code> <code><b>/user/:uuid?timestamp=<timestamp>&signature=<signature></b></code> <code>Returns a user by their uuid</code></summary>

##### Parameters

> | name         |  required     | data type               | description                                                           |
> |--------------|-----------|-------------------------|-----------------------------------------------------------------------|
> | timestamp    |  true     | string                  | in a production system timestamps prevent replay attacks  |
> | signature    |  true     | string (signature)      | the signature from sessionless for the message  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json`                | `USER`   |
> | `406`         | `application/json`                | `{"code":"406","message":"Not acceptable"}`                            |

##### Example cURL

> ```javascript
>  curl -X GET -H "Content-Type: application/json" https://<placeholderURL>/<uuid>?timestamp=123&signature=signature
> ```

</details>

<details>
 <summary><code>GET</code> <code><b>/user/:uuid/tickets?timestamp=<timestamp>&signature=<signature></b></code> <code>Sets aside a flavor for ticketing</code></summary>

##### Parameters

> | name         |  required     | data type               | description                                                           |
> |--------------|-----------|-------------------------|-----------------------------------------------------------------------|
> | timestamp    |  true     | string                  | in a production system timestamps prevent replay attacks  |
> | signature    |  true     | string (signature)      | the signature from sessionless for the message  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json`                | `{flavor: flavor}`   |
> | `406`         | `application/json`                | `{"code":"406","message":"Not acceptable"}`                            |

##### Example cURL

> ```javascript
>  curl -X GET -H "Content-Type: application/json" https://<placeholderURL>/<uuid>?timestamp=123&signature=signature
> ```

</details>

<details>
 <summary><code>GET</code> <code><b>/user/:uuid/tickets/:flavor?timestamp=<timestamp>&signature=<signature></b></code> <code>Tells how many of the given flavor ticket are remaining</code></summary>

##### Parameters

> | name         |  required     | data type               | description                                                           |
> |--------------|-----------|-------------------------|-----------------------------------------------------------------------|
> | timestamp    |  true     | string                  | in a production system timestamps prevent replay attacks  |
> | signature    |  true     | string (signature)      | the signature from sessionless for the message  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json`                | `{flavor: quantity}`   |
> | `406`         | `application/json`                | `{"code":"406","message":"Not acceptable"}`                            |

##### Example cURL

> ```javascript
>  curl -X GET -H "Content-Type: application/json" https://<placeholderURL>/<uuid>?timestamp=123&signature=signature
> ```

</details>

<details>
 <summary><code>PUT</code> <code><b>/user/:uuid/grant</b></code> <code>Grants admin nineum to Aretha for your galaxy</code></summary>

##### Parameters

> | name         |  required     | data type               | description                                                           |
> |--------------|-----------|-------------------------|-----------------------------------------------------------------------|
> | timestamp    |  true     | string                  | in a production system timestamps prevent replay attacks  |
> | uuid         |  true     | string                  | the uuid of the galactic nineum holder  |
> | signature    |  true     | string (signature)      | the signature from sessionless for the message  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json`                | `{flavor: quantity}`   |
> | `406`         | `application/json`                | `{"code":"406","message":"Not acceptable"}`                            |

##### Example cURL

> ```javascript
>  curl -X PUT -H "Content-Type: application/json" https://<placeholderURL>/user/<uuid>/grant
> ```

</details>

### Purchasing and getting of the ticket

You might notice from the APIs that there is no API for purchasing, and retrieving a digital thing. 
That's because purchases in allyabase go through [addie][addie], and the association of the digital thing to the user's inventory happens via a spell. 
And then the watching of where the digital thing is is handled by [fount][fount] since fount handles the allocation of nineum.



[allyabase]: https://github.com/planet-nine-app/allyabase
[nineum]: https://github.com/planet-nine-app/fount/blob/main/Nineum.md
[magic]: https://github.com/planet-nine-app/MAGIC
[addie]: https://github.com/planet-nine-app/addie
[fount]: https://github.com/planet-nine-app/fount

