export enum Day {
  Mon,
  Tue,
  Wed,
  Thu,
  Fri,
  Sat,
  Sun
};

export enum ClassType {
  Lecture,
  Tutorial
}

// Time, specified in 24-hour time
export type Time = [hour: number, minute: number];

export interface Class {
  start: Time,
  end: Time,
  day: Day,
  type: ClassType,
  name: string
};

export interface Subject {
  name: string,
  classes: {
    [index: string]: Class[]
  }
}

interface ITimetable {
  classes: Class[],
  subjects: Subject[]
}

export class Timetable implements ITimetable {
  classes: Class[];
  subjects: Subject[];

  constructor(classes: Class[], subjects: Subject[]) {
    this.classes = classes;
    this.subjects = subjects;
  }

  children(): Timetable[] {
    // iterator to return child timetables
    return [];
  }
}
