export enum Day {
  Mon,
  Tue,
  Wed,
  Thu,
  Fri,
  Sat,
  Sun,
}

export enum ActivityType {
  Lecture,
  Tutorial,
}

// Time, specified in 24-hour time
export type Time = [hour: number, minute: number];

// A start and end Time pair
type Times = [start: Time, end: Time];

export interface IActivity {
  activity_type: ActivityType;
  name: string;
  activity_id: number;
  weeks: number[];
  day: Day;
  times: Times;
  location: string;
}

export class Activity implements IActivity {
  activity_type: ActivityType;
  name: string;
  activity_id: number;
  weeks: number[];
  day: Day;
  times: Times;
  location: string;

  constructor(
    activity_type: ActivityType,
    name: string,
    activity_id: number,
    weeks: number[],
    day: Day,
    times: Times,
    location: string
  ) {
    this.activity_type = activity_type;
    this.name = name;
    this.activity_id = activity_id;
    this.weeks = weeks;
    this.day = day;
    this.times = times;
    this.location = location;
  }
}

export interface IStream {
  stream_id: number;
  activity_list: Activity[];
}

export class Stream implements IStream {
  stream_id: number;
  activity_list: Activity[];

  constructor(stream_id: number, activity_list: Activity[]) {
    this.stream_id = stream_id;
    this.activity_list = activity_list;
  }
}

export interface IActivityGroup {
  name: string;
  group_id: number;
  stream_list: Stream[];
}

export class ActivityGroup implements IActivityGroup {
  name: string;
  group_id: number;
  stream_list: Stream[];

  constructor(name: string, group_id: number, stream_list: Stream[]) {
    this.name = name;
    this.group_id = group_id;
    this.stream_list = stream_list;
  }
}

export interface ISubject {
  code: string;
  name: string;
  year: number;
  offering: string;
  activity_groups: ActivityGroup[];
}

export class Subject implements ISubject {
  code: string;
  name: string;
  year: number;
  offering: string;
  activity_groups: ActivityGroup[];

  constructor(
    code: string,
    name: string,
    year: number,
    offering: string,
    activity_groups: ActivityGroup[]
  ) {
    this.code = code;
    this.name = name;
    this.year = year;
    this.offering = offering;
    this.activity_groups = activity_groups;
  }
}

// A Timetable is a collection of subjects with an allocation for one stream per
//  ActivityGroup

// This is what the evaluation function will take as an input.

export interface ITimetable {
  subjects: Subject[];
  allocation: number[][];
}

// A preference represents the user input - very unrefined

export interface IPreferences {
  timeRestrictionStart: Time;
  timeRestrictionEnd: Time;
  avoidDays: number[];
  minimiseClashes: boolean;
  skipLectures: boolean;
  cramClasses: boolean;
  allocateBreaks: boolean;
  streamedClasses: boolean;
}
