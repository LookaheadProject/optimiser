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
export type Time = { hour: number; minute: number };

// // A start and end Time pair
export type Times = { start: Time; end: Time };

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
  activity_group_list: ActivityGroup[];
  cache: {};
}

export class Subject implements ISubject {
  code: string;
  name: string;
  year: number;
  offering: string;
  activity_group_list: ActivityGroup[];
  cache: {};
  constructor(
    code: string,
    name: string,
    year: number,
    offering: string,
    activity_group_list: ActivityGroup[]
  ) {
    this.code = code;
    this.name = name;
    this.year = year;
    this.offering = offering;
    this.activity_group_list = activity_group_list;
    this.cache = {};
  }
}

// No longer using Timetable. We are going to use subject and allocation as individual entities
export interface ITimetable {
  subjects: Subject[];
  allocation: number[][];
}

export interface IAllocation {
  allocation: number[][];
}

// A preference represents the user input - very unrefined

export interface IPreferences {
  timeRestriction: Times;
  avoidDays: number[];
  minimiseClashes: boolean;
  skipLectures: boolean;
  minimiseDaysOnCampus: boolean;
  allocateBreaks: boolean;
  minimiseBreaks: boolean;
}

export interface Ievaluator {
  (
    subjects: ISubject[],
    allocation: IAllocation,
    preferences: IPreferences
  ): number;
}

export interface Ioptimiser {
  (
    allocations: IAllocation[],
    subjects: ISubject[],
    preferences: IPreferences,
    evaluation: Ievaluator
  ): IAllocation[];
}
