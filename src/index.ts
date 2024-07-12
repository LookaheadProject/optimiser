export * from "./structures";
export * from "./optimiser";

import {
  Day,
  ISubject,
  IPreferences
} from "./structures";

import { optimise } from "./optimiser";

if (require.main === module) {
  // The following are one example of each of the main structures from the schema
  
  const subjects: ISubject[] = [
    require("./example_subject_MAST20005.json")
  ];
  
  const examplePreferences: IPreferences = {
    timeRestrictionStart: [8, 30],
    timeRestrictionEnd: [16, 30],
    avoidDays: [Day.Fri],
    minimiseClashes: false,
    skipLectures: true,
    cramClasses: false,
    allocateBreaks: true,
    streamedClasses: false
  }
  
  let optimisedTimetable = optimise(subjects, examplePreferences);
  
  // output result with full depth
  console.dir(optimisedTimetable, { depth: null })
}
