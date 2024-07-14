export * from "./structures";
export * from "./optimiser";
export * from "./evaluate";

import {
  Day,
  Days,
  ISubject,
  IPreferences
} from "./structures";

import {
  evaluate
} from "./evaluate";

import { optimise, sortOptimsation } from "./optimiser";

if (require.main === module) {
  // The following are one example of each of the main structures from the schema

  const subjects: ISubject[] = [
    require("./example_subject_MAST20005.json"),
    require("./example_subject_MAST20026.json")
  ];

  const examplePreferences: IPreferences = {
    timeRestriction: { start: { hour: 8, minute: 30 }, end: { hour: 22, minute: 0 } },
    avoidDays: [Days.indexOf(Day.Mon), Days.indexOf(Day.Tue)],
    minimiseClashes: true,
    skipLectures: false,
    minimiseDaysOnCampus: false,
    allocateBreaks: 0,
    minimiseBreaks: false
  }


  let optimisedTimetable = optimise(subjects, examplePreferences, evaluate, sortOptimsation);

  // output result with full depth
  console.dir(optimisedTimetable.slice(0, 10), { depth: null })

}
