<<<<<<< HEAD
# DAQ View React

## Introduction

An implementation of client-side daqview monitoring application for the CMS DAQ FED Builder and Filter-Based Filter Farm infrastructure.

Data are provided by the DAQ Aggregator snapshots in form of JSON files and React.js is used for processing and rendering monitoring information on the client, without any need for server-side logic.



## Todo
- [ ] comment TypeScript code
- [x] implement sorting on all FFF table columns
- [x] add styles to FB table
- [ ] implement sorting of FB table (default order by TTCP name, option to order by any RU column, maybe TTS state)
- [ ] complete display of FEDs in the FB table
  - [ ] correctly find and distribute dependent FEDs
- [ ] display FED errors in RU warn column of FB table
- [x] add header view to display snapshot metadata and system status
  - [ ] add additional information (beam mode etc.)
- [ ] add page-wide styles and/or notifications to draw the shifter's attention to a problem
- [x] rewrite parser to match the new snapshot format
- [ ] add navigation options (display snapshot by run, session, time, next/previous snapshot) => requires server-side API
- [ ] add expert option to display additional data from the snapshot

- [ ] switch back to production React before deploying