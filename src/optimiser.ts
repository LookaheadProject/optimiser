import { ISubject, IAllocation, IPreferences, Time } from "./structures";

// parameters
// 1. list of subjects
// 2. preferences
// 3. algorithm
// 4. evaluation function

// export function optimise(subjects: ISubject[], preferences: IPreferences): IAllocation[] {

// }

// Helper Functions

// returns number of hours time1 is after time2
export function timesDifference(time1: Time, time2: Time): number {
  return time1.hour - time2.hour + (time2.minute - time1.minute) / 60;
}

export function consolidatedEvaluate(
  subjects: ISubject[],
  allocation: IAllocation,
  preferences: IPreferences
): number {
  // things we can change
  const minute_block = 15; // must be divisor of 60
  const break_minutes = 60;

  // dont change these
  const day_minutes = 24 * 60;
  const hour_blocks = 60 / minute_block;
  const day_blocks = day_minutes / minute_block;
  const week_blocks = day_blocks * 5;
  const break_length = break_minutes / minute_block;

  let activities = Array<number>(week_blocks).fill(0);
  let score = 0;
  let restrictionScore = 0;
  let evalContributors = 2;
  let activity_count = 0;
  let clash_count = 0;
  let days = Array<number>(5).fill(0);

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (activity.activity_type || !preferences.skipLectures) {
          // record the number of activities processes for normalisation
          activity_count = activity_count + 1;

          // record which days activities occur
          days[stream.activity_list[k].day] = 1;

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

          // determine determine if this activity clashes
          let clash = 0;

          // activity minute_block start index and duration
          let start =
            day_blocks * activity.day +
            hour_blocks * activity.times.start.hour +
            activity.times.start.minute;
          let duration =
            timesDifference(activity.times.end, activity.times.start) *
            hour_blocks;

          for (let t = start; t < start + duration; t++) {
            // record if there is a clash in minute block t
            if (activities[t]) {
              clash = 1;
            }

            // record that an activity occured in minute block t
            activities[t] = 1;
          }

          if (clash) {
            clash_count = clash_count + 1;
          }
        }
      }
    }
  }

  // Adding scores based on preferences

  if (preferences.minimiseClashes) {
    score = score + 1 - clash_count / (activity_count - 1);
    evalContributors++;
  }

  if (preferences.minimiseDaysOnCampus) {
    score = score + 1;

    for (let num of days) {
      score -= 0.2 * num;
    }

    evalContributors++;
  }

  if (preferences.minimiseBreaks || preferences.allocateBreaks) {
    let sub_breaks = 0;
    let activity_occured = 0;
    let break_count = 0;

    // find number of breaks between classes in the week
    for (let i = 0; i < week_blocks; i++) {
      if (activities[i] && sub_breaks >= break_length) {
        if (!activity_occured) {
          activity_occured = 1;
        } else {
          break_count++;
        }

        sub_breaks = 0;
      } else {
        sub_breaks++;
      }
    }

    if (preferences.minimiseBreaks) {
      score = score + 1 - break_count / (activity_count - 1);
      evalContributors++;
    }

    if (preferences.allocateBreaks) {
      score = score + break_count / (activity_count - 1);
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
    { hour: 10, minute: 0 },
    preferences.timeRestriction.end
  );
  let max_deviation = Math.max(start_deviation, end_deviation);

  score = score + 1 - restrictionScore / (activity_count * max_deviation ** 2);

  // adding avoidDays score
  score = score + 1;

  let day_weight = 1 / preferences.avoidDays.length;

  for (let day of preferences.avoidDays) {
    score -= day_weight * days[day];
  }

  return score / evalContributors;
}

export function evaluate(
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
  // can change this number. Must be a divisor of 60
  const minute_block = 15;

  const day_minutes = 24 * 60;
  const hour_blocks = 60 / minute_block;
  const day_blocks = day_minutes / minute_block;
  const week_blocks = day_blocks * 5;

  let activities = Array<number>(week_blocks).fill(0);
  let activity_count = 0;
  let clash_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subjects[i].activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        // only record if activity is tutorial or we don't skip tutorials
        if (activity.activity_type || !preference.skipLectures) {
          activity_count = activity_count + 1;

          let clash = 0;

          // activity minute_block start index and duration
          let start =
            day_blocks * activity.day +
            hour_blocks * activity.times.start.hour +
            activity.times.start.minute;
          let duration =
            timesDifference(activity.times.end, activity.times.start) *
            hour_blocks;

          for (let t = start; t < start + duration; t++) {
            // record if there is a clash in minute block t
            if (activities[t]) {
              clash = 1;
            }

            // record that an activity occured in minute block t
            activities[t] = 1;
          }

          if (clash) {
            clash_count = clash_count + 1;
          }
        }
      }
    }
  }

  return 1 - clash_count / activity_count - 1;
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
        if (stream.activity_list[k].activity_type || !preference.skipLectures) {
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
  // things we can change
  const minute_block = 15; // must be divisor of 60
  const break_minutes = 60;

  // dont change these
  const day_minutes = 24 * 60;
  const hour_blocks = 60 / minute_block;
  const day_blocks = day_minutes / minute_block;
  const week_blocks = day_blocks * 5;
  const break_length = break_minutes / minute_block;

  let activities = Array<number>(week_blocks).fill(0);
  let activity_count = 0;
  let break_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        if (activity.activity_type || !preference.skipLectures) {
          activity_count = activity_count + 1;

          // activity minute_block start index and duration
          let start =
            day_blocks * activity.day +
            hour_blocks * activity.times.start.hour +
            activity.times.start.minute;
          let duration =
            timesDifference(activity.times.end, activity.times.start) *
            hour_blocks;

          // record that an activity occured in minute block t
          for (let t = start; t < start + duration; t++) {
            activities[t] = 1;
          }
        }
      }
    }
  }

  let sub_breaks = 0;
  let activity_occured = 0;

  // iterate i over minute blocks
  for (let i = 0; i < week_blocks; i++) {
    if (activities[i] && sub_breaks >= break_length) {
      if (!activity_occured) {
        activity_occured = 1;
      } else {
        break_count++;
      }

      sub_breaks = 0;
    } else {
      sub_breaks++;
    }
  }
  return 1 - break_count / activity_count;
}

// Still working on this function

// Idea
// pealise for not having breaks between classes

export function allocateBreaksEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  // things we can change
  const minute_block = 15; // must be divisor of 60
  const break_minutes = 60;

  // dont change these
  const day_minutes = 24 * 60;
  const hour_blocks = 60 / minute_block;
  const day_blocks = day_minutes / minute_block;
  const week_blocks = day_blocks * 5;
  const break_length = break_minutes / minute_block;

  let activities = Array<number>(week_blocks).fill(0);
  let activity_count = 0;
  let break_count = 0;

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];
      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        let activity = stream.activity_list[k];

        if (activity.activity_type || !preference.skipLectures) {
          activity_count = activity_count + 1;

          // activity minute_block start index and duration
          let start =
            day_blocks * activity.day +
            hour_blocks * activity.times.start.hour +
            activity.times.start.minute;
          let duration =
            timesDifference(activity.times.end, activity.times.start) *
            hour_blocks;

          // record that an activity occured in minute block t
          for (let t = start; t < start + duration; t++) {
            activities[t] = 1;
          }
        }
      }
    }
  }

  let sub_breaks = 0;
  let activity_occured = 0;

  // iterate i over minute blocks
  for (let i = 0; i < week_blocks; i++) {
    if (activities[i] && sub_breaks >= break_length) {
      if (!activity_occured) {
        activity_occured = 1;
      } else {
        break_count++;
      }

      sub_breaks = 0;
    } else {
      sub_breaks++;
    }
  }
  return break_count / activity_count;
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
        if (activity.activity_type || !preference.skipLectures) {
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
  let score = 1;
  let days = Array<number>(5).fill(0);

  for (let i = 0; i < subjects.length; i++) {
    let subject = subjects[i];

    for (let j = 0; j < subject.activity_group_list.length; j++) {
      let activity_group = subject.activity_group_list[j];

      let stream = activity_group.stream_list[allocation.allocation[i][j]];

      for (let k = 0; k < stream.activity_list.length; k++) {
        // set record which day the activity is on

        // if the class is a tutorial or we don't skip lectures then record the day
        if (stream.activity_list[k].activity_type || !preference.skipLectures) {
          // record which days activities occur
          days[stream.activity_list[k].day] = 1;
        }
      }
    }
  }

  let day_weight = 1 / preference.avoidDays.length;

  for (let day of preference.avoidDays) {
    score -= day_weight * days[day];
  }

  return score;
}
