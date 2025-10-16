# Aretha - Planet Nine Nineum Transfer & Tag Management Service

## Overview

Aretha is a Planet Nine allyabase microservice that manages nineum transfers, ticket purchases, and user tagging with sessionless authentication. Aretha maintains a Fount account that holds nineum inventory for distribution to users via MAGIC spells.

**Location**: `/aretha/`
**Port**: 3010 (default)

## Core Features

### 🎟️ **Nineum Operations**
- **Ticket Purchases**: Transfer nineum from Aretha's Fount account to buyers
- **Nineum Inventory**: Aretha holds ticket nineum for event sales
- **MP Integration**: Purchase spells integrate with Fount's MP system
- **Admin Permissions**: Grant admin-level nineum permissions

### 🏷️ **Tag Management**
- **User Tags**: Create and manage user tags
- **Tag Retrieval**: Fast tag lookup and filtering
- **Sessionless Auth**: All operations use cryptographic signatures
- **Flexible Tagging**: Support for arbitrary tag structures

## MAGIC Spells

### Nineum Spells
1. **arethaUserPurchase** ✨ (January 2025)
   - Atomically purchases tickets with MP via MAGIC protocol
   - Transfers nineum from Aretha's Fount account → buyer
   - Components: `{ flavor: "12-hex-string", quantity: 1 }`
   - MP cost specified in `totalCost` (validated by Fount resolver)
   - Returns: `{ success: true, transfer: {...} }`

2. **arethaUserTickets**
   - Purchase nineum tickets (grants to Aretha's account)
   - Components: `{ uuid, flavor, quantity }`

3. **arethaUserGrant**
   - Grant admin nineum permissions
   - Components: `{ uuid }`

4. **arethaUserGalaxy**
   - Set galaxy permissions for users
   - Components: `{ uuid, galaxy }`

### Tag Spells
5. **arethaUserCreate** - Create user with tags
6. **arethaUserTag** - Add/update tag for user
7. **arethaUserTags** - Retrieve user's tags
8. **arethaUserTagDelete** - Delete specific tag

### Gateway Spells
9. **joinup** - Gateway forwarding for multi-destination spells
10. **linkup** - Direct Fount forwarding

## Implementation Details

**Location**: `/src/server/node/src/magic/magic.js`

**Key Functions**:
- `getFountUser()` - Retrieves Aretha's Fount service account
- All spells benefit from centralized Fount authentication
- Automatic experience granting and gateway reward distribution via MAGIC protocol

## Fount Integration

Aretha maintains its own Fount user account (`aretha.fountUUID`) which:
- Holds inventory of nineum for ticket sales
- Acts as the source for nineum transfers
- Enables Aretha to participate in the MAGIC protocol economy

## Last Updated
January 15, 2025 - Added `arethaUserPurchase` spell for MP ticket purchases. Fixed "fountain" → "fount" naming throughout magic handler.
