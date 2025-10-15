# Aretha - Planet Nine Tag Management Service

## Overview

Aretha is a Planet Nine allyabase microservice that manages tags and tagging with sessionless authentication.

**Location**: `/aretha/`
**Port**: 3010 (default)

## Core Features

### 🏷️ **Tag Management**
- **User Tags**: Create and manage user tags
- **Tag Retrieval**: Fast tag lookup and filtering
- **Sessionless Auth**: All operations use cryptographic signatures
- **Flexible Tagging**: Support for arbitrary tag structures

## API Endpoints

### Tag Operations
- `PUT /user/create` - Create user with tags
- `PUT /user/:uuid/tag` - Add/update tag for user
- `GET /user/:uuid/tags` - Retrieve user's tags
- `DELETE /user/:uuid/tag/:tag` - Delete specific tag

### MAGIC Protocol
- `POST /magic/spell/:spellName` - Execute MAGIC spells for tag operations

### Health & Status
- `GET /health` - Service health check

## MAGIC Route Conversion (October 2025)

All Aretha REST endpoints have been converted to MAGIC protocol spells:

### Converted Spells (4 total)
1. **arethaUserCreate** - Create user with tags
2. **arethaUserTag** - Add/update tag for user
3. **arethaUserTags** - Retrieve user's tags
4. **arethaUserTagDelete** - Delete specific tag

**Testing**: Comprehensive MAGIC spell tests available in `/test/mocha/magic-spells.js` (10 tests covering success and error cases)

**Documentation**: See `/MAGIC-ROUTES.md` for complete spell specifications and migration guide

## Implementation Details

**Location**: `/src/server/node/src/magic/magic.js`

All tag operations maintain the same functionality as the original REST endpoints while benefiting from centralized Fount authentication and MAGIC protocol features like experience granting and gateway rewards.

## Last Updated
October 14, 2025 - Completed full MAGIC protocol conversion. All 4 routes now accessible via MAGIC spells with centralized Fount authentication.
