import { start } from "repl";
import {
  ISubject,
  IAllocation,
  IPreferences,
  Time,
  Days,
  Activity,
  ActivityTypes
} from "./structures";

// returns number of hours time1 is after time2
function timesDifference(time1: Time, time2: Time): number {
  return time1.hour - time2.hour + (time1.minute - time2.minute) / 60;
}

// Transform a allocation into a unique string representing the allocation
// Intention is to use for caching

export function codeAllocation(allocation: IAllocation): string {
  let a = "";

  for (let i = 0; i < allocation.allocation.length; i++) {
    for (let j = 0; j < allocation.allocation[i].length; j++) {
      a = a + Number(allocation.allocation[i][j]).toString();

      if (j < allocation.allocation[i].length - 1) {
        a = a + "b";
      }
    }

    if (i < allocation.allocation.length - 1) {
      a = a + "a";
    }
  }

  return a;
}

// decodes string representation of an allocation

export function decodeAllocation(code: string): IAllocation {
  let outer_list: number[][] = [];
  let inner_list: number[] = [];
  let sub_string = "";

  let i = 0;
  let j = 0;

  for (let k of code) {
    if (k == "a" || k == "b") {
      inner_list[j] = parseInt(sub_string);
      sub_string = "";
    } else {
      sub_string = sub_string + k;
    }

    if (k == "a") {
      outer_list[i] = inner_list;
      inner_list = [];
      i++;
      j = 0;
    }

    if (k == "b") {
      j++;
    }
  }
  inner_list[j] = parseInt(sub_string);
  outer_list[i] = inner_list;

  return { allocation: outer_list };
}

export function evaluate(
  subjects: ISubject[],
  allocation: IAllocation,
  preferences: IPreferences
): number {
  // first check if score for this allocation has been stored in cache
  const minimise_break_minutes = 60;
  const allocate_break_minutes = 60 * preferences.allocateBreaks;
  const initial_penalisation = 1;
  const subsequent_penalisation = 0.5;

  let activities: Activity[][] = [[], [], [], [], [], [], []];
  let total_overlap = 0;
  let class_time = 0;

  let score = 0;
  let restrictionScore = 0;
  let evalContributors = 2;
  let activity_count = 0;

  let days = Array<number>(7).fill(0);

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(activity.activity_type) || !preferences.skipLectures) {
          // record the number of activities processes for normalisation
          activity_count = activity_count + 1;

          // record which days activities occur
          days[Days.indexOf(stream.activity_list[k].day)] += 1;

          // find the maximum deviation of the class from time restrictions.
          let activity_start = activity.times.start;
          let activity_end = activity.times.end;
          let restriction_start = preferences.timeRestriction.start;
          let restriction_end = preferences.timeRestriction.end;

          let start_deviation = Math.max(
            timesDifference(restriction_start, activity_start),
            timesDifference(activity_start, restriction_end)
          );

          let end_deviation = Math.max(
            timesDifference(restriction_start, activity_end),
            timesDifference(activity_end, restriction_end)
          );

          let deviation = Math.max(start_deviation, end_deviation, 0);

          restrictionScore = restrictionScore + deviation ** 2;

          // clashes calculations
          let start = activity.times.start;
          let end = activity.times.end;

          class_time += timesDifference(end, start);

          let max_overlap = 0;

          const dayIndex = Days.indexOf(activity.day);

          for (let l of activities[dayIndex]) {
            let startl = l.times.start;
            let endl = l.times.end;

            let latest_start = Math.max(
              start.hour + 60 * start.minute,
              startl.hour + 60 * startl.minute
            );
            let earliest_end = Math.min(
              end.hour + 60 * end.minute,
              endl.hour + 60 * endl.minute
            );

            let overlap = Math.max(0, earliest_end - latest_start);

            if (overlap > max_overlap) {
              max_overlap = overlap;
            }

            if (timesDifference(startl, end) > 0) {
              break;
            }
          }

          total_overlap = total_overlap + max_overlap;

          // Ordering activites for minimise and allocate breaks

          activities[dayIndex].push(activity);

          let day_activities = activities[dayIndex];

          for (let l = day_activities.length - 2; l >= 0; l--) {
            if (timesDifference(day_activities[l].times.start, start) > 0) {
              let temp = day_activities[l];
              day_activities[l] = activity;
              day_activities[l + 1] = temp;
            } else {
              break;
            }
          }
        }
      }
    }
  }

  // Adding scores based on preferences

  let days_present = days.reduce((prev_sum, d) => prev_sum + d, 0);

  if (preferences.minimiseClashes) {
    score += 1 - total_overlap / class_time;
    evalContributors++;
  }

  if (preferences.minimiseDaysOnCampus) {
    score = score + 1;

    score -= 0.2 * days_present;

    evalContributors++;
  }

  if (preferences.minimiseBreaks || preferences.allocateBreaks) {
    let breaks = 0;
    let minimiseBreaks = 0;
    let allocateBreaks = 0;

    for (let i = 0; i < 7; i++) {
      let day_activities = activities[i];

      let prev = day_activities[0];

      for (let j = 1; j < day_activities.length; j++) {
        let cur = day_activities[j];

        let minimise_break_length = Math.min(
          minimise_break_minutes,
          Math.max(0, timesDifference(cur.times.start, prev.times.end))
        );

        let allocate_break_length = Math.min(
          allocate_break_minutes,
          Math.max(0, timesDifference(cur.times.start, prev.times.end))
        );

        minimiseBreaks += minimise_break_length;
        allocateBreaks += allocate_break_length;

        if (timesDifference(prev.times.end, cur.times.end) < 0) {
          prev = cur;
        }
      }
    }

    // normalise values
    allocateBreaks += allocate_break_minutes * days_present;
    minimiseBreaks += minimise_break_minutes * days_present;

    let allocate_max_breaks = allocate_break_minutes * activity_count;
    let minimise_max_breaks = minimise_break_minutes * activity_count;

    if (preferences.minimiseBreaks) {
      score += 1 - minimiseBreaks / minimise_max_breaks;
      evalContributors++;
    }

    if (preferences.allocateBreaks) {
      score += allocateBreaks / allocate_max_breaks;
      evalContributors++;
    }
  }

  // adding timeRestiction score

  // finding maximum deviation for a day
  let start_deviation = timesDifference(preferences.timeRestriction.start, {
    hour: 8,
    minute: 0,
  });
  let end_deviation = timesDifference(
    { hour: 22, minute: 0 },
    preferences.timeRestriction.end
  );
  let max_deviation = Math.max(start_deviation, end_deviation);

  if (max_deviation == 0) {
    score += 1;
  } else {
    score += 1 - restrictionScore / (activity_count * max_deviation ** 2);
  }

  // adding avoidDays score
  let sub_score = 0;

  console.log("Score");
  console.log(score);
  console.log(activity_count);

  let maximum_penalisation =
    initial_penalisation *
      Math.min(activity_count, preferences.avoidDays.length) +
    subsequent_penalisation *
      Math.max(0, activity_count - preferences.avoidDays.length);

  for (let day of preferences.avoidDays) {
    if (days[day] > 0) {
      sub_score += initial_penalisation;
    }

    if (days[day] > 1) {
      sub_score += subsequent_penalisation * (days[day] - 1);
    }
  }
  score += sub_score / maximum_penalisation;
  return score / evalContributors;
}

export function longEvaluate(
  subjects: ISubject[],
  allocation: IAllocation,
  preferences: IPreferences
): number {
  let score = 0;
  let evalContributors = 2;

  if (preferences.minimiseClashes) {
    score = score + minimiseClashesEval(subjects, allocation, preferences);
    evalContributors++;
  }

  if (preferences.minimiseDaysOnCampus) {
    score = score + minimiseDaysOnCampusEval(subjects, allocation, preferences);
    evalContributors++;
  }

  if (preferences.minimiseBreaks) {
    score = score + minimiseBreaksEval(subjects, allocation, preferences);
    evalContributors++;
  }

  if (preferences.allocateBreaks) {
    score = score + allocateBreaksEval(subjects, allocation, preferences);
    evalContributors++;
  }

  score = score + timeRestrictionEval(subjects, allocation, preferences);

  score = score + avoidDaysEval(subjects, allocation, preferences);

  return score / evalContributors;
}

export function minimiseClashesEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  let activities: Activity[][] = [[], [], [], [], []];
  let total_overlap = 0;
  let class_time = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];
        const dayIndex = Days.indexOf(activity.day);

        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(activity.activity_type) || !preference.skipLectures) {
          let start = activity.times.start;
          let end = activity.times.end;

          class_time = class_time + timesDifference(end, start);

          let max_overlap = 0;

          // iterate through all activities in the activity day
          for (let l of activities[dayIndex]) {
            let startl = l.times.start;
            let endl = l.times.end;

            let latest_start = Math.max(
              start.hour + 60 * start.minute,
              startl.hour + 60 * startl.minute
            );
            let earliest_end = Math.min(
              end.hour + 60 * end.minute,
              endl.hour + 60 * endl.minute
            );

            let overlap = Math.max(0, earliest_end - latest_start);

            //
            if (overlap > max_overlap) {
              max_overlap = overlap;
            }
          }

          activities[dayIndex].push(activity);

          total_overlap = total_overlap + max_overlap;
        }
      }
    }
  }

  return 1 - total_overlap / class_time;
}

export function minimiseDaysOnCampusEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  let score = 1;
  let days = Array<number>(5).fill(0);

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(stream.activity_list[k].activity_type) || !preference.skipLectures) {
          days[stream.activity_list[k].day] = 1;
        }
      }
    }
  }
  // subtract 0.2 for each day on campus
  for (let num of days) {
    score -= 0.2 * num;
  }

  return score;
}

export function minimiseBreaksEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  const break_minutes = 60;

  let activities: Activity[][] = [[], [], [], [], [], [], []];
  let days = Array<number>(7).fill(0);
  let activity_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(activity.activity_type) || !preference.skipLectures) {
          activity_count = activity_count + 1;

          let day_activities = activities[Days.indexOf(activity.day)];

          day_activities.push(activity);

          // preserve activity order of the day

          let start = activity.times.start;

          for (let l = day_activities.length - 2; l >= 0; l--) {
            if (timesDifference(day_activities[l].times.start, start) > 0) {
              let temp = day_activities[l];
              day_activities[l] = activity;
              day_activities[l + 1] = temp;
            } else {
              break;
            }
          }
        }
      }
    }
  }

  // determine the number of clashes

  let breaks = 0;

  for (let i = 0; i < 7; i++) {
    let day_activities = activities[i];

    let prev = day_activities[0];

    for (let j = 1; j < day_activities.length; j++) {
      let cur = day_activities[j];
      days[cur.day] = 1;

      let break_length = Math.min(
        break_minutes,
        Math.max(0, timesDifference(cur.times.start, prev.times.end))
      );

      breaks = breaks + break_length;

      if (timesDifference(prev.times.end, cur.times.end) < 0) {
        prev = cur;
      }
    }
  }

  // normalise values
  let days_present = days.reduce((prev_sum, d) => prev_sum + d, 0);

  breaks = breaks + break_minutes * days_present;

  let max_breaks = break_minutes * activity_count;

  return 1 - breaks / max_breaks;
}

export function allocateBreaksEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  const break_minutes = 60 * preference.allocateBreaks;

  let activities: Activity[][] = [[], [], [], [], [], [], []];
  let days = Array<number>(7).fill(0);
  let activity_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(activity.activity_type) || !preference.skipLectures) {
          activity_count = activity_count + 1;

          let day_activities = activities[Days.indexOf(activity.day)];

          day_activities.push(activity);

          // preserve activity order of the day

          let start = activity.times.start;

          for (let l = day_activities.length - 2; l >= 0; l--) {
            if (timesDifference(day_activities[l].times.start, start) > 0) {
              let temp = day_activities[l];
              day_activities[l] = activity;
              day_activities[l + 1] = temp;
            } else {
              break;
            }
          }
        }
      }
    }
  }

  // determine the number of clashes

  let breaks = 0;

  for (let i = 0; i < 7; i++) {
    let day_activities = activities[i];

    let prev = day_activities[0];

    for (let j = 1; j < day_activities.length; j++) {
      let cur = day_activities[j];
      days[cur.day] = 1;

      let break_length = Math.min(
        break_minutes,
        Math.max(0, timesDifference(cur.times.start, prev.times.end))
      );

      breaks = breaks + break_length;

      if (timesDifference(prev.times.end, cur.times.end) < 0) {
        prev = cur;
      }
    }
  }

  // normalise values
  let days_present = days.reduce((prev_sum, d) => prev_sum + d, 0);

  breaks = breaks + break_minutes * days_present;

  let max_breaks = break_minutes * activity_count;

  return breaks / max_breaks;
}

export function timeRestrictionEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  let score = 0;
  let activity_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (ActivityTypes.indexOf(activity.activity_type) || !preference.skipLectures) {
          activity_count = activity_count + 1;

          // find the maximum deviation of the class from time restrictions.
          let activity_start = activity.times.start;
          let activity_end = activity.times.end;
          let restriction_start = preference.timeRestriction.start;
          let restriction_end = preference.timeRestriction.end;

          let start_deviation = Math.max(
            timesDifference(restriction_start, activity_start),
            timesDifference(activity_start, restriction_end)
          );

          let end_deviation = Math.max(
            timesDifference(restriction_start, activity_end),
            timesDifference(activity_end, restriction_end)
          );

          let deviation = Math.max(start_deviation, end_deviation, 0);

          score = score + deviation ** 2;
        }
      }
    }
  }

  // finding maximum deviation for a day
  let start_deviation = timesDifference(preference.timeRestriction.start, {
    hour: 8,
    minute: 0,
  });
  let end_deviation = timesDifference(
    { hour: 10, minute: 0 },
    preference.timeRestriction.end
  );
  let max_deviation = Math.max(start_deviation, end_deviation);

  return 1 - score / (activity_count * max_deviation ** 2);
}

export function avoidDaysEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  const initial_penalisation = 1;
  const subsequent_penalisation = 0.5;
  let score = 1;
  let days = Array<number>(5).fill(0);
  let activity_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];

      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        // set record which day the activity is on

        // if the class is a tutorial or we don't skip lectures then record the day
        if (ActivityTypes.indexOf(stream.activity_list[k].activity_type) || !preference.skipLectures) {
          activity_count += 1;

          // record which days activities occur
          days[stream.activity_list[k].day] += 1;
        }
      }
    }
  }

  let maximum_penalisation =
    initial_penalisation *
      Math.min(activity_count, preference.avoidDays.length) +
    subsequent_penalisation *
      Math.max(0, activity_count - preference.avoidDays.length);

  for (let day of preference.avoidDays) {
    if (days[day] > 0) {
      score += initial_penalisation;
    }

    if (days[day] > 1) {
      score += subsequent_penalisation * (days[day] - 1);
    }
  }

  return 1 - score / maximum_penalisation;
}
