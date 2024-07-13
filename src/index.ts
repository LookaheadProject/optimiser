export * from "./structures";
export * from "./optimiser";

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
    require("./example_subject_MAST20005.json")
  ];

  const examplePreferences: IPreferences = {
    timeRestriction: { start: { hour: 8, minute: 30 }, end: { hour: 8, minute: 30 } },
    avoidDays: [Days.indexOf(Day.Mon), Days.indexOf(Day.Tue), Days.indexOf(Day.Fri)],
    minimiseClashes: true,
    skipLectures: false,
    minimiseDaysOnCampus: true,
    allocateBreaks: 1,
    minimiseBreaks: true
  }


  let optimisedTimetable = optimise(subjects, examplePreferences, evaluate, sortOptimsation);

  // output result with full depth
  console.dir(optimisedTimetable, { depth: null })

}
