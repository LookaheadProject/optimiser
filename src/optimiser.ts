import { ISubject, ITimetable, IPreferences } from "./structures";

// any other parameters needed here?
export function optimise(subjects: ISubject[], preferences: IPreferences): ITimetable {
  let timetable = {
    subjects: subjects,
    allocation: [] // perhaps allocation should be an interface? not sure here
  }

  return timetable;
}

export function evaluate(timetable: ITimetable, preferences: IPreferences): Number {
  return 0;
}
