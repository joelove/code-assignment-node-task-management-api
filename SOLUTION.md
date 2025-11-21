# Solution Documentation

## Part 1: Performance Issues Fixed

### [Issue fixed]

**Initial thoughts:**

API response times increasing exponentially with higher number of results might suggest nested data mapping or transformation, per-result follow-up queries or inefficent in-memory filtering.

The database load being high adds weight to the subsequent queries theory. Also could just be one wildly inefficent query. To investigate.

The task assignment delays are a bit less clear, maybe we're making a blocking call to some external service? That increase would be pretty linear though so need to look closer.

Search performance degrading adds weight to the in-memory filtering theory but could also be some sort of data mapping.

**First Steps:**

First, I want to get a benchmark for each of the issues by writing some perfomance tests. While I'm there, I'll add some extra coverage if it needs it (just to help me avoid causing any subtle behaviour changes during refactoring).

**Problem Identified:**
[Describe the problem you found]

**Solution Implemented:**
[Describe your fix]

**Performance Impact:**
[Describe the improvement]

## Part 2: Activity Log Feature

### Implementation Approach

[Describe your overall approach to implementing the activity log]

### Database Schema Design

[Explain your schema choices]

### API Design Decisions

[Explain your API design choices]

### Performance Considerations

[Describe any performance optimizations you implemented]

### Trade-offs and Assumptions

[List any trade-offs you made or assumptions about requirements]

## Future Improvements

[Suggest potential improvements that could be made with more time]

## Time Spent

[Document how long you spent on each part]
