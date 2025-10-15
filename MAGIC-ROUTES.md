# Aretha MAGIC-Routed Endpoints

## Overview

Aretha now supports MAGIC-routed versions of all PUT operations. These spells route through Fount (the resolver) for centralized authentication, eliminating the need for direct authentication in Aretha.

## Converted Routes

### 1. Create User
**Direct Route**: `PUT /user/create`
**MAGIC Spell**: `arethaUserCreate`
**Cost**: 50 MP

**Components**:
```javascript
{
  pubKey: "user-public-key"
}
```

**Returns**:
```javascript
{
  success: true,
  user: {
    uuid: "user-uuid",
    pubKey: "user-public-key",
    fountUser: {
      uuid: "fount-user-uuid",
      pubKey: "user-public-key"
    }
  }
}
```

**Validation**:
- Requires valid pubKey
- Creates Fount user if doesn't exist
- Returns Aretha user with Fount connection

---

### 2. Purchase Nineum Tickets
**Direct Route**: `PUT /user/:uuid/tickets/:flavor`
**MAGIC Spell**: `arethaUserTickets`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid",
  flavor: "010203040506",  // 12 hex characters
  quantity: 10
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires uuid, flavor, and quantity
- Flavor must be 12 hex characters (00-ff for each attribute)
- Flavor format: `[charge][direction][rarity][size][texture][shape]`
  - Charge: 2 hex digits (01 = positive, 02 = negative, etc.)
  - Direction: 2 hex digits (01 = north, 02 = south, etc.)
  - Rarity: 2 hex digits (01 = common, 02 = uncommon, etc.)
  - Size: 2 hex digits (01 = tiny, 02 = small, etc.)
  - Texture: 2 hex digits (01 = smooth, 02 = rough, etc.)
  - Shape: 2 hex digits (01 = sphere, 02 = cube, etc.)

---

### 3. Admin Grant Nineum
**Direct Route**: `PUT /user/:uuid/grant`
**MAGIC Spell**: `arethaUserGrant`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid"
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires uuid
- Administrative operation for granting nineum permissions
- Requires Fount fountain user to be available

---

### 4. Set Galactic Nineum
**Direct Route**: `PUT /user/:uuid/galaxy`
**MAGIC Spell**: `arethaUserGalaxy`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid",
  galaxy: "28880014"  // Galaxy identifier
}
```

**Returns**:
```javascript
{
  success: true,
  data: {
    // Galactic nineum data from Fount
  }
}
```

**Validation**:
- Requires uuid and galaxy
- Sets galaxy-level nineum permissions
- Galaxy identifier is an 8-character hex string

---

## Implementation Details

### File Changes

1. **`/src/server/node/src/magic/magic.js`** - Added four new spell handlers:
   - `arethaUserCreate(spell)`
   - `arethaUserTickets(spell)`
   - `arethaUserGrant(spell)`
   - `arethaUserGalaxy(spell)`

2. **`/fount/src/server/node/spellbooks/spellbook.js`** - Added spell definitions with destinations and costs

3. **`/test/mocha/magic-spells.js`** - New test file with comprehensive spell tests

4. **`/test/mocha/package.json`** - Added `fount-js` dependency

### Authentication Flow

```
Client → Fount (resolver) → Aretha MAGIC handler → Business logic
           ↓
    Verifies signature
    Deducts MP
    Grants experience
    Grants nineum
```

**Before (Direct REST)**:
- Client signs request
- Aretha verifies signature directly
- Aretha executes business logic
- Aretha calls Fount for nineum operations

**After (MAGIC Spell)**:
- Client signs spell
- Fount verifies signature & deducts MP
- Fount grants experience & nineum to caster
- Fount forwards to Aretha
- Aretha executes business logic (no auth needed)
- Aretha calls Fount for nineum operations with service credentials

### Naming Convention

Route path → Spell name transformation:
```
/user/create                     → arethaUserCreate
/user/:uuid/tickets/:flavor      → arethaUserTickets
/user/:uuid/grant                → arethaUserGrant
/user/:uuid/galaxy               → arethaUserGalaxy
```

Pattern: `[service][PathWithoutSlashesAndParams]`

### Nineum Flavor System

Nineum tickets use a 12-character hex flavor string to specify attributes:

```javascript
flavor = "010203040506"
         ││││││││││││
         ││││││││││└┴─ shape (01-06)
         ││││││││└┴─── texture (01-06)
         ││││││└┴───── size (01-06)
         ││││└┴─────── rarity (01-06)
         ││└┴───────── direction (01-06)
         └┴─────────── charge (01-02)
```

**Example Flavors**:
- `010101010101` - Positive, North, Common, Tiny, Smooth, Sphere
- `020206040306` - Negative, South, Epic, Standard, Rough, Cube
- `010203040506` - Positive, North, Uncommon, Standard, Bumpy, Cylinder

### Error Handling

All spell handlers return consistent error format:
```javascript
{
  success: false,
  error: "Error description"
}
```

## Testing

Run MAGIC spell tests:
```bash
cd aretha/test/mocha
npm install
npm test magic-spells.js
```

Test coverage:
- ✅ User creation via spell
- ✅ Admin nineum grant via spell
- ✅ Nineum ticket purchase via spell
- ✅ Galaxy permission setting via spell
- ✅ Missing pubKey validation
- ✅ Invalid flavor validation
- ✅ Missing uuid validation
- ✅ Missing galaxy fields validation

## Benefits

1. **No Direct Authentication**: Aretha handlers don't need to verify signatures
2. **Centralized Auth**: All signature verification in one place (Fount)
3. **Automatic Rewards**: Every spell grants experience + nineum
4. **Gateway Rewards**: Gateway participants get 10% of rewards
5. **Reduced Code**: Aretha handlers simplified without auth logic
6. **Consistent Pattern**: Same flow across all services

## Differences from Direct REST

### Authentication
- **REST**: Direct signature verification in Aretha
- **MAGIC**: Fount verifies, Aretha trusts resolver

### Service Identity
- **REST**: User authenticates directly
- **MAGIC**: Aretha uses service account (fountUser) for Fount operations

### Nineum Operations
Both REST and MAGIC routes call Fount for nineum operations:
- Ticket purchases forward to Fount's `/user/:uuid/nineum` endpoint
- Admin grants forward to Fount's `/user/:uuid/nineum/admin` endpoint
- Galaxy settings forward to Fount's `/user/:uuid/nineum/galactic` endpoint

Aretha acts as a ticketing service, delegating actual nineum management to Fount.

## Next Steps

Progress on MAGIC route conversion:
- ✅ Joan (3 routes complete)
- ✅ Pref (4 routes complete)
- ✅ Aretha (4 routes complete)
- ⏳ Continuebee
- ⏳ BDO
- ⏳ Julia
- ⏳ Dolores
- ⏳ Sanora
- ⏳ Addie
- ⏳ Covenant
- ⏳ Prof
- ⏳ Fount (internal routes)
- ⏳ Minnie (SMTP only, no HTTP routes)

## Last Updated
January 14, 2025
