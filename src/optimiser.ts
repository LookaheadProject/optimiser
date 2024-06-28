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
function timesDifference(time1: Time, time2: Time): number {
  return time1[0] - time2[0] + (time1[1] - time2[1]) / 60;
}

export function evaluate(
  subjects: ISubject[],
  allocation: IAllocation,
  preferences: IPreferences
): number {
  // Need to ensure that allocation is compatible with 
  // ISubject.
  
  let score = 0;

  // evalContributors records number of sub evaluation 
  // functions added to score. This is used to 
  // normalise score.

  let evalContributors = 2;

  // minimiseClashes, minimiseDaysOnCampus, minimiseBreaks and allocateBreaks
  // are only applied if selected

  if (preferences.minimiseClashes) {
    score = score + minimiseClashesEval(subjects, allocation, preferences);
    evalContributors = evalContributors + 1;
  }

  if (preferences.minimiseDaysOnCampus) {
    score = score + minimiseDaysOnCampusEval(subjects, allocation, preferences);
    evalContributors = evalContributors + 1;
  }

  if (preferences.minimiseBreaks) {
    score = score + minimiseBreaksEval(subjects, allocation, preferences);
    evalContributors = evalContributors + 1;
  }

  if (preferences.allocateBreaks) {
    score = score + allocateBreaksEval(subjects, allocation, preferences);
    evalContributors = evalContributors + 1;
  }

  // sub evaluation timeRestiction and avoidDays always applied
  score = score + timeRestrictionEval(subjects, allocation, preferences);

  score = score + avoidDaysEval(subjects, allocation, preferences);

  return score / evalContributors;
}


// Still working on this function. 
function minimiseClashesEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {

  // How to determine if there has been a clash? 
  // 1. Checking all pairwise activities 
  // 2. Recording in a structure and looking up

  let classes = {};

  // interate i over number of subjects
  for (let i of Array.from(Array(subjects.length).keys())) {

    // iterate j over number of activity groups
    for (let j of Array.from(
      Array(subjects[i].activity_groups.length).keys()
    )) {

      // identify the stream for this activity group from allocation
      let stream = subjects[i].activity_groups[j].stream_list[allocation[i][j]];

      // iterate over all activities in the stream
      for (let k of Array.from(Array(stream.activity_list.length).keys())) {
        let activity = stream.activity_list[k];


      }
    }
  }

  return 0;
}


function minimiseDaysOnCampusEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  // days records which days this timetable is on campus
  let days = Array<number>(5).fill(0);

  // iterate i over number of subjects
  for (let i of Array.from(Array(subjects.length).keys())) {

    // iterate j over number of activity groups
    for (let j of Array.from(
      Array(subjects[i].activity_groups.length).keys()
    )) {

      // find the stream for this activity group from allocation
      let stream = subjects[i].activity_groups[j].stream_list[allocation[i][j]];

      // iterate over all activities in the stream
      for (let k of Array.from(Array(stream.activity_list.length).keys())) {
        
        // if the activity is a tutorial or we don't skip lectures then record the day
        if (stream.activity_list[k].activity_type || !preference.skipLectures) {
          days[stream.activity_list[k].day] = 1;
        }
      }
    }
  }

  // Calculate the score subtracting -0.2 for each day on campus

  let score = 1;
  for (let num of days) {
    score -= 0.2 * num;
  }

  return score;
}

// Still working on this function 

// Idea
// peanalised for having breaks between classes
function minimiseBreaksEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  return 0;
}


// Still working on this function 

// Idea 
// pealise for not having breaks between classes

function allocateBreaksEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  return 0;
}


function timeRestrictionEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  let score = 0;

  let number_tutorials = 0;
  let number_lectures = 0;

  // iterate over all subjects
  for (let i of Array.from(Array(subjects.length).keys())) {

    // iterate j over activity groups
    for (let j of Array.from(
      Array(subjects[i].activity_groups.length).keys()
    )) {

      // find the stream for this activity group from allocation
      let stream = subjects[i].activity_groups[j].stream_list[allocation[i][j]];

      // iterate over all activities in the stream
      for (let k of Array.from(Array(stream.activity_list.length).keys())) {
        let activity = stream.activity_list[k];

        // record which type of activity used to normalise score at the end

        if (activity.activity_type) {
          number_lectures = number_lectures + 1;
        } else {
          number_tutorials = number_tutorials + 1;
        }

        // if the activity is a tutorial or we don't skip lectures
        // add squared deviation to the score 

        if (activity.activity_type || !preference.skipLectures) {

          // find the maximum deviation of the class from time restrictions.
          let activity_start = activity.times[0];
          let activity_end = activity.times[1];
          let restriction_start = preference.timeRestriction[0];
          let restriction_end = preference.timeRestriction[1];

          let start_deviation = Math.max(
            timesDifference(restriction_start, activity_start),
            timesDifference(activity_start, restriction_end)
          );

          let end_deviation = Math.max(
            timesDifference(restriction_start, activity_end),
            timesDifference(activity_end, restriction_end)
          );

          // start_deviation and end_deviation are negative if they fall inside
          // the restriction so only care if they are greater than 0 and also
          // which one violates the restriction more so we take their maximum 
          // with 0

          let deviation = Math.max(start_deviation, end_deviation, 0);

          score = score + deviation ** 2;
        }
      }
    }
  }

  // Calculate the maximum possible score

  // Determine if the largest possible deviation is from having a class at 8 am or 10 pm

  let start_deviation = timesDifference(preference.timeRestriction[0], [8, 0]);
  let end_deviation = timesDifference([10, 0], preference.timeRestriction[1]);
  
  let max_deviation = Math.max(start_deviation, end_deviation);

  // maximum score is achieved when every class has a maximum deviation

  let max_score = number_tutorials * max_deviation ** 2;

  // if we don't skip lectures also count lectures
  if (!preference.skipLectures) {
    max_score = max_score + number_lectures * max_deviation ** 2;
  }

  return 1 - score / max_score;
}


function avoidDaysEval(
  subjects: ISubject[],
  allocation: IAllocation,
  preference: IPreferences
): number {
  let days = Array<number>(5).fill(0);

  // iterate over all subjects
  for (let i of Array.from(Array(subjects.length).keys())) {

    // iterate j over activity groups
    for (let j of Array.from(
      Array(subjects[i].activity_groups.length).keys()
    )) {

      // find the stream for this activity group from allocation
      let stream = subjects[i].activity_groups[j].stream_list[allocation[i][j]];

      // iterate over all activities in the stream
      for (let k of Array.from(Array(stream.activity_list.length).keys())) {
        // set record which day the activity is on

        // if the class is a tutorial or we don't skip lectures then record the day
        if (stream.activity_list[k].activity_type || !preference.skipLectures) {
          days[stream.activity_list[k].day] = 1;
        }
      }
    }
  }

  // Calculate the score subtracing day_weight for each day on avoidDays which we are on  for each day on campus
  let score = 1;

  // normalise the amount we penalise for having an activity on a day we want to avoid  
  let day_weight = 1 / preference.avoidDays.length;

  for (let day of preference.avoidDays) {
    score -= day_weight * days[day];
  }

  return score;
}
