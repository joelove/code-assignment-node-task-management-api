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

1. The `TasksService.findAll` method loads all tasks, then performs N+1 queries to fetch related `assignee`, `project`, and `tags` for each task, then applies filters in memory. This causes response times to scale linearly with the number of tasks and creates heavy DB load.

2. Chaining queries in the TaskService adds unneccessary database load.

3. The email service task assignment notification is blocking and causes the request to hang for two seconds.

4. Database query efficiency has room for improvement. Lack of indexes causes slow filter lookups and use of include over select could cause some unnecesary computation.

**Solution Implemented:**

1. Refactored TasksService.findAll to push all filtering into the database and fetch relations in a single call, eliminating the N+1 pattern and in-memory filtering. It now builds a Prisma where object from TaskFilterDto and calls prisma.task.findMany({ where, include: { assignee, project, tags }, orderBy: { createdAt: 'desc' } }).

2. Replaced the individual queries for each of assignee, project, tags with a single where/include to decrease database load and speed up request turnaround.

3. Initially replaced the awaited service call with an ad-hoc child-process worker. But pivoted to use a more-idiomatic NestJS BullMQ (Redis) queue and processor; TasksService now enqueues email jobs so requests return immediately while EmailService runs unchanged in the background.

4. Added indexes for each of the queryable fields. Add cache interceptor to findAll query. Replace include with select for marginal query speed gains in higher volume queries.

**Performance Impact:**

Initially, getting ~1000 tasks was taking around 250ms and assigning a task was taking over two seconds. By benchmarking the initial performance, I was able to gather a baseline that looked like:

- **Get all tasks:** 257ms
- **Get all tasks (5 concurrent requests):** 758ms
- **Post task with assignee:** 2023ms
- **Filter tasks by status completed:** 205ms
- **Filter assignee and date:** 166ms

After refactoring the TaskService and creating a queue to run the email service in the background, the peformance was increased dramatically:

- **Get all tasks:** 107ms
- **Get all tasks (5 concurrent requests)**: 254ms
- **Post task with assignee:** 16ms
- **Filter tasks by status completed**: 52ms
- **Filter assignee and date**: 19ms

Next, I increased the seeded dataset in the performance test to 20,000 tasks and compared results before and after each query optimisation. By adding indexed, a cache interceptor and refactoring the query to use select over include, the performance improved with large get all tasks queries by 20-25%:

- **Get all tasks:** 544ms -> 437ms
- **Get all tasks (5 concurrent requests):** 1688ms -> 1280ms

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
