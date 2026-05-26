# Research: Temporal Data and Hierarchical Catalog Patterns

## Executive Summary

This document provides research and recommendations for two critical data modeling patterns in the Volunteer Webapp:

1. **Den Membership History Pattern**: Time-bounded child-to-den assignments with complete historical tracking
2. **Adventure/Requirement Catalog Structure**: Hierarchical rank → adventure → requirement catalog system

Both patterns are informed by Prisma best practices, temporal data modeling research, and real-world applications in education/curriculum management systems.

---

## Topic 1: Den Membership History Pattern

### Problem Statement

Need to model time-bounded child-to-den assignments with the following requirements:
- Track which children belong to which dens over time
- Preserve complete historical record (child moves from Tiger den to Wolf den)
- Efficiently query "current members of Den A" and "what was Child X's den on date Y?"
- Prevent overlapping memberships (child can't be in two dens simultaneously)

### Research Findings

#### Pattern 1: Temporal Columns (valid_from/valid_to) ⭐ RECOMMENDED

**Approach**: Single table with temporal columns marking validity periods.

```prisma
model Den {
  id          String   @id @default(cuid())
  name        String   // e.g., "Den 3 - Tigers"
  rankLevel   RankLevel
  leaderId    String?
  leader      Volunteer? @relation("DenLeader", fields: [leaderId], references: [id])
  
  members     DenMembership[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime? // Soft delete
  
  @@index([rankLevel])
  @@index([deletedAt])
}

model DenMembership {
  id          String    @id @default(cuid())
  denId       String
  den         Den       @relation(fields: [denId], references: [id], onDelete: Cascade)
  childRankId String
  childRank   ChildRank @relation(fields: [childRankId], references: [id], onDelete: Cascade)
  
  // Temporal tracking
  validFrom   DateTime  @default(now())
  validTo     DateTime? // NULL = current membership
  
  // Audit trail
  assignedBy  String?   // volunteerId who made the assignment
  reason      String?   // "Promotion", "New Scout", "Den Restructure"
  
  createdAt   DateTime  @default(now())
  
  // Prevent overlapping memberships
  @@index([childRankId, validTo]) // Optimize "current membership" queries
  @@index([denId, validTo])       // Optimize "current den roster" queries
  @@index([validFrom, validTo])   // Range queries
}
```

**Query Examples:**

```typescript
// 1. Get current members of a den
const currentMembers = await prisma.denMembership.findMany({
  where: {
    denId: denId,
    validTo: null, // NULL indicates current
  },
  include: {
    childRank: {
      include: {
        volunteer: true,
      },
    },
  },
});

// 2. Get a child's den on a specific date
const membership = await prisma.denMembership.findFirst({
  where: {
    childRankId: childRankId,
    validFrom: { lte: queryDate },
    OR: [
      { validTo: null },
      { validTo: { gte: queryDate } },
    ],
  },
  include: { den: true },
});

// 3. Get complete membership history for a child
const history = await prisma.denMembership.findMany({
  where: { childRankId: childRankId },
  orderBy: { validFrom: 'desc' },
  include: { den: true },
});

// 4. Find children without current den assignment
const unassigned = await prisma.childRank.findMany({
  where: {
    denMemberships: {
      none: {
        validTo: null,
      },
    },
  },
});

// 5. Detect overlapping memberships (validation query)
const overlaps = await prisma.denMembership.findMany({
  where: {
    childRankId: childRankId,
    validTo: null, // Current membership
  },
});
// If overlaps.length > 1, there's a data integrity issue
```

**Preventing Overlaps:**

```typescript
// Business logic in service layer
async function assignChildToDen(
  childRankId: string,
  newDenId: string,
  effectiveDate: Date = new Date(),
) {
  // 1. Check for existing current membership
  const currentMembership = await prisma.denMembership.findFirst({
    where: {
      childRankId: childRankId,
      validTo: null,
    },
  });
  
  // 2. Close current membership if exists
  if (currentMembership) {
    await prisma.denMembership.update({
      where: { id: currentMembership.id },
      data: { validTo: effectiveDate },
    });
  }
  
  // 3. Create new membership
  return prisma.denMembership.create({
    data: {
      denId: newDenId,
      childRankId: childRankId,
      validFrom: effectiveDate,
      validTo: null,
    },
  });
}
```

**Index Strategy:**

```prisma
// Critical indexes for performance
@@index([childRankId, validTo]) // WHERE childRankId = X AND validTo IS NULL
@@index([denId, validTo])       // WHERE denId = X AND validTo IS NULL
@@index([validFrom, validTo])   // Range scans for historical queries
```

**Pros:**
- ✅ Single source of truth - all data in one table
- ✅ Efficient "current members" queries with `WHERE validTo IS NULL`
- ✅ Simple to understand and maintain
- ✅ Direct foreign key relationships preserved
- ✅ Standard SQL temporal pattern (SQL:2011 standard)
- ✅ Works seamlessly with Prisma's query API

**Cons:**
- ⚠️ Overlap prevention requires application-level validation
- ⚠️ Date range queries on large datasets need proper indexing
- ⚠️ SQLite doesn't optimize IS NULL as well as PostgreSQL

---

#### Pattern 2: Separate History Table (Alternative)

**Approach**: Current state in one table, history in another.

```prisma
model DenMembership {
  id          String    @id @default(cuid())
  denId       String
  den         Den       @relation(fields: [denId], references: [id])
  childRankId String    @unique // One current den per child
  childRank   ChildRank @relation(fields: [childRankId], references: [id])
  
  assignedAt  DateTime  @default(now())
  
  @@index([denId])
}

model DenMembershipHistory {
  id          String    @id @default(cuid())
  denId       String
  denName     String    // Denormalized for historical accuracy
  childRankId String
  
  validFrom   DateTime
  validTo     DateTime  // Always populated in history
  reason      String?
  
  createdAt   DateTime  @default(now())
  
  @@index([childRankId, validFrom])
  @@index([denId, validFrom])
}
```

**Pros:**
- ✅ Enforces uniqueness constraint (one current den per child)
- ✅ Very fast current state queries
- ✅ Historical data doesn't impact current queries

**Cons:**
- ❌ Data duplication - need triggers or app logic to move records
- ❌ More complex queries when spanning current + historical
- ❌ Harder to maintain consistency
- ❌ Not recommended for Prisma (no native trigger support)

---

### Recommendation: Temporal Columns Pattern ⭐

**Choose Pattern 1** (temporal columns) because:
1. **Prisma-friendly**: Works naturally with Prisma's query API without triggers
2. **Single source of truth**: All data in one table reduces complexity
3. **Proven pattern**: Widely used in enterprise applications (Temporal Table pattern)
4. **Type-safe**: Prisma generates proper TypeScript types
5. **Flexible**: Easy to add metadata fields (assignedBy, reason, etc.)

**Implementation Checklist:**
- [ ] Add `Den` model to schema
- [ ] Add `DenMembership` model with temporal columns
- [ ] Add relationship to `ChildRank`
- [ ] Create indexes for common queries
- [ ] Implement business logic with overlap prevention
- [ ] Add validation: `validTo` cannot be before `validFrom`
- [ ] Add migration for existing data (if applicable)
- [ ] Create seed data for testing
- [ ] Write unit tests for overlap prevention
- [ ] Write integration tests for common queries

**Performance Considerations:**
- `WHERE validTo IS NULL` queries are highly efficient with proper index
- For PostgreSQL, consider partial index: `CREATE INDEX CONCURRENTLY ON den_membership (child_rank_id) WHERE valid_to IS NULL`
- For SQLite, standard indexes work well for small-to-medium datasets (<100k memberships)

---

## Topic 2: Adventure/Requirement Catalog Structure

### Problem Statement

Need to model hierarchical adventure and requirement catalogs with:
- Rank → Adventure → Requirement hierarchy
- Adventures classified as Required, Elective, or Special Elective
- Requirements have display order and text
- Potential catalog versioning across program years
- Efficient queries: "All required adventures for Wolf rank" and "All requirements for Adventure X"

### Research Findings

#### Pattern 1: Three-Table Hierarchy ⭐ RECOMMENDED

**Approach**: Normalized structure with clear parent-child relationships.

```prisma
// ============================================================================
// Advancement Catalog
// ============================================================================

model Rank {
  id          String      @id @default(cuid())
  rankLevel   RankLevel   @unique // LION, TIGER, WOLF, BEAR, WEBELOS, AOL
  displayName String      // "Tiger", "Wolf", etc.
  displayOrder Int        @unique
  description String?
  
  adventures  Adventure[]
  
  // Catalog versioning
  catalogYear String      @default("2024") // BSA program year
  isActive    Boolean     @default(true)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([catalogYear, isActive])
  @@index([displayOrder])
}

model Adventure {
  id            String            @id @default(cuid())
  rankId        String
  rank          Rank              @relation(fields: [rankId], references: [id], onDelete: Cascade)
  
  name          String            // "Backyard Jungle", "Paws on the Path"
  description   String?
  classification AdventureType    // REQUIRED, ELECTIVE, SPECIAL_ELECTIVE
  displayOrder  Int               // Within the rank
  
  requirements  Requirement[]
  completions   AdventureCompletion[]
  
  // Catalog versioning
  catalogYear   String            @default("2024")
  isActive      Boolean           @default(true)
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  @@unique([rankId, name, catalogYear]) // Prevent duplicate adventure names per rank/year
  @@index([rankId, classification])     // "All required adventures for Wolf"
  @@index([catalogYear, isActive])
}

enum AdventureType {
  REQUIRED
  ELECTIVE
  SPECIAL_ELECTIVE
}

model Requirement {
  id            String      @id @default(cuid())
  adventureId   String
  adventure     Adventure   @relation(fields: [adventureId], references: [id], onDelete: Cascade)
  
  displayOrder  Int         // 1, 2, 3, ... within the adventure
  requirementText String    @db.Text // Full requirement description
  
  completions   RequirementCompletion[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@unique([adventureId, displayOrder]) // Ensure unique ordering
  @@index([adventureId, displayOrder])  // Optimize ordered retrieval
}

// ============================================================================
// Advancement Tracking (Child Progress)
// ============================================================================

model AdventureCompletion {
  id            String    @id @default(cuid())
  childRankId   String
  childRank     ChildRank @relation(fields: [childRankId], references: [id], onDelete: Cascade)
  adventureId   String
  adventure     Adventure @relation(fields: [adventureId], references: [id], onDelete: Restrict)
  
  completedAt   DateTime  @default(now())
  approvedBy    String?   // volunteerId
  
  @@unique([childRankId, adventureId])
  @@index([childRankId])
  @@index([adventureId])
}

model RequirementCompletion {
  id            String      @id @default(cuid())
  childRankId   String
  childRank     ChildRank   @relation(fields: [childRankId], references: [id], onDelete: Cascade)
  requirementId String
  requirement   Requirement @relation(fields: [requirementId], references: [id], onDelete: Restrict)
  
  completedAt   DateTime    @default(now())
  approvedBy    String?     // volunteerId
  notes         String?     // Optional context
  
  @@unique([childRankId, requirementId])
  @@index([childRankId])
  @@index([requirementId])
}
```

**Query Examples:**

```typescript
// 1. Get all required adventures for Wolf rank
const requiredAdventures = await prisma.adventure.findMany({
  where: {
    rank: { rankLevel: 'WOLF' },
    classification: 'REQUIRED',
    isActive: true,
  },
  orderBy: { displayOrder: 'asc' },
  include: {
    requirements: {
      orderBy: { displayOrder: 'asc' },
    },
  },
});

// 2. Get all requirements for a specific adventure
const adventureWithRequirements = await prisma.adventure.findUnique({
  where: { id: adventureId },
  include: {
    requirements: {
      orderBy: { displayOrder: 'asc' },
    },
    rank: true,
  },
});

// 3. Get child's progress on Wolf rank adventures
const progress = await prisma.rank.findUnique({
  where: { rankLevel: 'WOLF' },
  include: {
    adventures: {
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        requirements: {
          orderBy: { displayOrder: 'asc' },
          include: {
            completions: {
              where: { childRankId: childRankId },
            },
          },
        },
        completions: {
          where: { childRankId: childRankId },
        },
      },
    },
  },
});

// 4. Get requirements completed but adventure not marked complete
const partiallyComplete = await prisma.adventure.findMany({
  where: {
    rankId: rankId,
    completions: {
      none: {
        childRankId: childRankId,
      },
    },
    requirements: {
      some: {
        completions: {
          some: {
            childRankId: childRankId,
          },
        },
      },
    },
  },
});

// 5. Bulk seed adventures for a rank
await prisma.rank.create({
  data: {
    rankLevel: 'WOLF',
    displayName: 'Wolf',
    displayOrder: 3,
    adventures: {
      create: [
        {
          name: 'Call of the Wild',
          classification: 'REQUIRED',
          displayOrder: 1,
          requirements: {
            create: [
              { displayOrder: 1, requirementText: 'With your family or den, attend...' },
              { displayOrder: 2, requirementText: 'Learn about a threatened or endangered species...' },
              // ... more requirements
            ],
          },
        },
        // ... more adventures
      ],
    },
  },
});
```

**Versioning Strategy:**

```prisma
// Approach 1: Catalog Year Field (Simple) ⭐ RECOMMENDED
// - Add catalogYear field to Rank, Adventure
// - Query by: WHERE catalogYear = '2024' AND isActive = true
// - Pros: Simple, works for annual BSA updates
// - Cons: Doesn't track mid-year changes

// Approach 2: Separate Catalog Table (Complex)
model AdvancementCatalog {
  id          String   @id @default(cuid())
  year        String   @unique // "2024", "2025"
  effectiveFrom DateTime
  effectiveTo   DateTime?
  
  ranks       Rank[]
}
// - Pros: Explicit versioning, supports mid-year changes
// - Cons: More complex, overkill for BSA requirements
```

**Recommendation: Use catalogYear + isActive fields** for simplicity. BSA requirements change annually, so year-based versioning is sufficient.

**Index Strategy:**

```prisma
// Rank indexes
@@index([catalogYear, isActive])
@@index([displayOrder])

// Adventure indexes
@@index([rankId, classification])     // Filter by required/elective
@@index([catalogYear, isActive])

// Requirement indexes
@@index([adventureId, displayOrder])  // Ordered retrieval
```

---

#### Pattern 2: JSON/Denormalized Catalog (Alternative)

**Approach**: Store entire catalog as JSON in PackConfig.

```prisma
model PackConfig {
  // ... existing fields
  advancementCatalog Json // Entire Rank → Adventure → Requirement structure
}
```

**Pros:**
- ✅ Simple schema
- ✅ Easy to import/export entire catalog

**Cons:**
- ❌ Cannot query/filter at adventure/requirement level
- ❌ No referential integrity
- ❌ Cannot track child progress efficiently
- ❌ Loses type safety
- ❌ Not suitable for interactive advancement tracking

---

### Recommendation: Three-Table Hierarchy ⭐

**Choose Pattern 1** (three-table hierarchy) because:
1. **Queryable**: Efficient filtering and searching at any level
2. **Relational integrity**: Foreign keys enforce data consistency
3. **Type-safe**: Prisma generates TypeScript types for the entire hierarchy
4. **Progress tracking**: Easy to link child completions to specific requirements
5. **Scalable**: Handles large catalogs efficiently with proper indexes
6. **Standard pattern**: Widely used in curriculum/education management systems

**Implementation Checklist:**
- [ ] Add `Rank`, `Adventure`, `Requirement` models
- [ ] Add `AdventureCompletion`, `RequirementCompletion` tracking models
- [ ] Create enum for `AdventureType`
- [ ] Add relationships to `ChildRank`
- [ ] Create indexes for common queries
- [ ] Import BSA official requirements via seed script
- [ ] Implement progress calculation logic
- [ ] Write queries for "X% complete" reporting
- [ ] Add validation: displayOrder must be unique within parent
- [ ] Create admin UI for catalog management (optional)
- [ ] Write tests for nested creates and queries

**Performance Considerations:**
- Nested includes (Rank → Adventure → Requirement) are efficient with proper indexes
- Use `orderBy` consistently to maintain display order
- Consider caching catalog data (changes infrequently)
- For large catalogs, implement pagination on adventure lists

---

## Comparison: Prisma vs Other ORMs

| Feature | Prisma | TypeORM | Sequelize |
|---------|--------|---------|-----------|
| Temporal columns | ✅ Native support | ✅ Native | ✅ Native |
| Nested creates | ✅ Excellent | ⚠️ Limited | ⚠️ Complex |
| Type generation | ✅ Automatic | ⚠️ Manual decorators | ❌ Weak |
| Date range queries | ✅ Intuitive | ✅ Good | ✅ Good |
| Hierarchical queries | ✅ Great with includes | ✅ Good | ⚠️ Verbose |

**Prisma's advantages** for these patterns:
- Type-safe nested creates (seed data is easy)
- Intuitive date comparison operators
- Automatic relationship loading with `include`
- Strong TypeScript integration

---

## Real-World Examples

### Temporal Data (Similar Patterns):
1. **Employment history**: Employee → Job assignments with effective dates
2. **Insurance policies**: Policy → Coverage periods
3. **Subscription services**: User → Plan with valid_from/valid_to
4. **Educational enrollment**: Student → Class → Semester

### Hierarchical Catalogs (Similar Patterns):
1. **Course catalogs**: School → Course → Module → Lesson
2. **Product hierarchies**: Category → Subcategory → Product
3. **Menu systems**: Restaurant → Menu → Section → Item
4. **Learning paths**: Curriculum → Course → Unit → Lesson

---

## Migration Strategy

### Adding Den Membership:

```typescript
// 1. Create Den and DenMembership tables
// 2. Optionally migrate existing ChildRank records to initial den assignments
// 3. Set validFrom = createdAt, validTo = null for all initial records

// Example migration seed
async function migrateToDenMembership() {
  // Create default dens by rank
  const dens = await Promise.all([
    prisma.den.create({ data: { name: 'Den 1 - Tigers', rankLevel: 'TIGER' } }),
    prisma.den.create({ data: { name: 'Den 2 - Wolves', rankLevel: 'WOLF' } }),
    // ... more dens
  ]);
  
  // Assign children to dens based on their rank
  const childRanks = await prisma.childRank.findMany();
  for (const child of childRanks) {
    const den = dens.find(d => d.rankLevel === child.rankLevel);
    if (den) {
      await prisma.denMembership.create({
        data: {
          denId: den.id,
          childRankId: child.id,
          validFrom: child.createdAt,
          validTo: null,
        },
      });
    }
  }
}
```

### Adding Adventure Catalog:

```typescript
// 1. Create Rank, Adventure, Requirement tables
// 2. Import BSA official requirements via seed script
// 3. No migration needed (new feature)

// Example seed script
import { officialBSARequirements } from './bsa-catalog-2024';

async function seedAdvancementCatalog() {
  for (const rankData of officialBSARequirements) {
    await prisma.rank.create({
      data: {
        rankLevel: rankData.level,
        displayName: rankData.name,
        displayOrder: rankData.order,
        catalogYear: '2024',
        adventures: {
          create: rankData.adventures.map((adv, idx) => ({
            name: adv.name,
            description: adv.description,
            classification: adv.type,
            displayOrder: idx + 1,
            catalogYear: '2024',
            requirements: {
              create: adv.requirements.map((req, reqIdx) => ({
                displayOrder: reqIdx + 1,
                requirementText: req.text,
              })),
            },
          })),
        },
      },
    });
  }
}
```

---

## Testing Recommendations

### Den Membership Tests:

```typescript
describe('DenMembership', () => {
  it('should prevent overlapping memberships', async () => {
    // Create child and two dens
    // Assign child to Den A
    // Attempt to assign to Den B without closing Den A
    // Should close Den A and create Den B membership
  });
  
  it('should query current members efficiently', async () => {
    // Create den with 10 children
    // 5 have validTo = null (current)
    // 5 have validTo = past date (historical)
    // Query should return only 5 current members
  });
  
  it('should find historical den membership', async () => {
    // Child was in Tiger den Jan-May
    // Child is in Wolf den May-present
    // Query for April should return Tiger den
  });
});
```

### Adventure Catalog Tests:

```typescript
describe('AdventureCatalog', () => {
  it('should seed complete Wolf rank catalog', async () => {
    // Seed Wolf rank with all adventures
    // Verify required adventures count
    // Verify elective adventures count
    // Verify all requirements have display order
  });
  
  it('should calculate adventure progress percentage', async () => {
    // Create adventure with 5 requirements
    // Mark 3 as complete for child
    // Calculate 60% progress
  });
  
  it('should handle catalog versioning', async () => {
    // Create 2024 and 2025 catalogs
    // Query 2024 adventures
    // Query 2025 adventures
    // Verify separation
  });
});
```

---

## Recommended Reading

### Temporal Data Patterns:
- [Prisma Temporal Data Guide](https://www.prisma.io/docs/concepts/components/prisma-client/aggregation-grouping-summarizing#temporal-data)
- [SQL Temporal Table Design](https://en.wikipedia.org/wiki/Temporal_database)
- Martin Fowler's "Temporal Patterns" (enterpriseintegrationpatterns.com)

### Hierarchical Data:
- [Prisma Nested Writes](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#nested-writes)
- Bill Karwin's "SQL Antipatterns" - Chapter on hierarchies
- [Materialized Path Pattern](https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-materialized-paths/) (alternative for deep trees)

### Type Safety:
- [Prisma Type Safety](https://www.prisma.io/docs/concepts/components/prisma-client/type-safety)
- [TypeScript Narrowing with Prisma](https://www.prisma.io/blog/satisfies-operator-ur8ys8ccq7zb)

---

## Summary

### Den Membership History
- ✅ **Use temporal columns** (validFrom/validTo)
- ✅ Create `Den` and `DenMembership` models
- ✅ Implement overlap prevention in business logic
- ✅ Index on `[childRankId, validTo]` for performance
- ✅ Query with `validTo IS NULL` for current memberships

### Adventure/Requirement Catalog
- ✅ **Use three-table hierarchy** (Rank → Adventure → Requirement)
- ✅ Add `catalogYear` for versioning
- ✅ Use enum for adventure classification
- ✅ Implement nested creates for seed data
- ✅ Link child progress with completion tracking models

Both patterns are **Prisma-native**, **type-safe**, and **production-ready** for NestJS applications.
