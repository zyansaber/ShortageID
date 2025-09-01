# Shortage Management WebApp MVP Todo

## Core Files to Create/Modify:

1. **src/firebase/config.js** - Firebase configuration and connection
2. **src/data/mockShortageData.js** - Mock data structure based on shortageID fields
3. **src/components/ShortageIdentification.jsx** - Main search and identification page
4. **src/components/KanbanView.jsx** - Kanban cards view with color coding
5. **src/components/SummaryTable.jsx** - Compact table with drawer functionality
6. **src/components/ShortageDrawer.jsx** - Detailed drawer with workflow and checklist
7. **src/App.jsx** - Main app with navigation between three views
8. **index.html** - Update title to "Shortage Management"

## Key Features Implementation:

### 1. Shortage Identification
- Search bar with dropdown results
- Real-time filtering by PartCode and Material Description
- Source flag determination (Kanban/BoM/Longtree/Other/None)
- Detail cards with supplier info and shortage reasons
- "Create shortage case" functionality

### 2. Kanban View
- Card grid layout with color coding (Red/Amber/Default)
- Filtering by stock levels, PO status, supplier
- Sorting by DaysCovered, OpenPOQty, StockLG0001
- Lazy loading support

### 3. Summary Table
- Compact table with all shortage cases
- Drawer with workflow steps and activity timeline
- Dashboard with metrics (collapsible)
- Status management and assignment

### 4. Root Cause Management
- Dynamic checklist based on shortage reasons
- Required actions tracking
- Activity logging

## Data Structure:
- Single collection approach using shortages
- Integration with Firebase shortageID fields
- Activity logging for audit trail