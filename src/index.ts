import {
  Subject,
  ActivityGroup,
  Stream,
  Activity,
  ActivityType,
  Day,
  ISubject
} from "./structures";

// The following are one example of each of the main structures from the schema

// Example Activity
let statsActivity = {
  activity_type: ActivityType.Lecture,
  name: "Lecture 1",
  activty_id: 1,
  weeks: [],
  day: Day.Mon,
  times: [
    [9, 0],
    [10, 0],
  ],
  location: "PAR-160-G-G01-JH Michell Theatre (308)",
};

// Example Stream with one acitivty
let statsStream = {
  stream_id: 1,
  activity_list: [statsActivity],
};

// Example ActivityGroup with one stream
let statsActivityGroup = {
  name: "Lecture",
  group_id: 1,
  stream_list: [statsStream],
};

// Example Subject with one ActivityGroup
let Statistics = {
  code: "MAST20005",
  name: "Statistics",
  year: "2024",
  offering: "Semester 2",
  activity_groups: [statsActivityGroup],
};

console.log(statsActivity);
console.log(statsStream);
console.log(statsActivityGroup);
console.log(Statistics);

// Constructor Examples

let Activity1 = new Activity(
  ActivityType.Lecture,
  "Lecture 1",
  1,
  [],
  Day.Mon,
  [
    [9, 0],
    [10, 0],
  ],
  "PAR-160-G-G01-JH Michell Theatre (308)"
);

let Stream1 = new Stream(1, [Activity1]);

let ActivityGroup1 = new ActivityGroup("Lecture", 1, [Stream1]);

let Subject1 = new Subject("MAST20005", "Statistics", 2024, "Semester 2", [
  ActivityGroup1,
]);

console.log(Activity1);
console.log(Stream1);
console.log(ActivityGroup1);
console.log(Subject1);

const statisticsSubject: ISubject = require("./example_subject.json");
console.log(statisticsSubject);
